import refreshToken from "../src/services/refreshToken";
import {mockFirebaseAdmin} from "./utils/testing.utils";
import jwt from "jsonwebtoken";

// TODO Move to setup file
require("dotenv").config({path: ".env.test"});

jest.mock("@sentry/serverless", () => ({
  captureException: jest.fn(),
}));

describe("refreshToken", () => {
  let mockRequest;
  let mockResponse;
  let userId;

  beforeEach(() => {
    process.env.JWT_SECRET = "SECRET";
    userId = "dGVzdEBleGFtcGxlLmNvbQ==-MACHINE_ID";
    mockRequest = {
      body: {
        token: "valid_token",
        machineIdentifier: "MACHINE_ID",
      },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it("returns 400 if token or machine identifier is not found", async () => {
    delete mockRequest.body.token;
    await refreshToken(mockRequest, mockResponse, mockFirebaseAdmin({}));

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith({error: "Bad request"});

    mockRequest.body.token = "valid_token";
    delete mockRequest.body.machineIdentifier;

    await refreshToken(mockRequest, mockResponse, mockFirebaseAdmin({}));

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith({error: "Bad request"});
  });

  it("should return 400 if key return missing information", async () => {
    const decodedRefreshToken = {
      userId,
      sessionId: "SESSION_ID",
      iss: process.env.ISS,
      version: "1.0.0",
    };

    mockRequest.body.token = jwt.sign(
      decodedRefreshToken,
      process.env.JWT_SECRET,
    );

    await refreshToken(
      mockRequest,
      mockResponse,
      mockFirebaseAdmin({
        licenseKey: "test-license-key",
        userId,
        status: "INACTIVE",
      }),
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.send).toHaveBeenCalledWith({
      error: "Invalid license key",
    });
  });

  it("should return 401 if token is not properly signed", async () => {
    const decodedRefreshToken = {
      userId,
      sessionId: "SESSION_ID",
      iss: process.env.ISS,
      version: "1.0.0",
    };

    mockRequest.body.token = jwt.sign(decodedRefreshToken, "other-secret");

    await refreshToken(
      mockRequest,
      mockResponse,
      mockFirebaseAdmin({
        licenseKey: "test-license-key",
        email: "test@example.com",
        status: "ACTIVE",
        machines: ["MACHINE_ID"],
      }),
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.send).toHaveBeenCalledWith({
      error: "Unauthorized",
    });
  });

  it("Brittle: should return a new token when given a valid token and machine identifier", async () => {
    const decodedRefreshToken = {
      userId,
      sessionId: "SESSION_ID",
      iss: process.env.ISS,
      version: "1.0.0",
    };
    const options = {
      algorithm: "HS256",
    };
    mockRequest.body.token = jwt.sign(
      decodedRefreshToken,
      process.env.JWT_SECRET,
      options,
    );

    await refreshToken(
      mockRequest,
      mockResponse,
      mockFirebaseAdmin({
        // Return values for License Key
        status: "ACTIVE",
        email: "test@example.com",
        machines: ["MACHINE_ID"],
        // Return values for Session
        userId,
        licenseKey: "test-license-key",
      }),
    );

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    decodedRefreshToken.sessionId = "NEW_SESSION_ID";

    expect(mockResponse.send).toHaveBeenCalledWith({
      accessToken: expect.any(String),
      refreshToken: jwt.sign(
        decodedRefreshToken,
        process.env.JWT_SECRET,
        options,
      ),
    });
  });

  it("should return 401 when machine related to key is not found", async () => {
    const decodedRefreshToken = {
      userId,
      sessionId: "SESSION_ID",
      iss: process.env.ISS,
      version: "1.0.0",
    };
    mockRequest.body.token = jwt.sign(
      decodedRefreshToken,
      process.env.JWT_SECRET,
    );
    const mockFirebase = mockFirebaseAdmin({
      // Return values for License Key
      status: "ACTIVE",
      email: "test@example.com",
      machines: ["INVALID_MACHINE_ID"],
      // Return values for Session
      userId,
      licenseKey: "test-license-key",
    });
    await refreshToken(mockRequest, mockResponse, mockFirebase);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.send).toHaveBeenCalledWith({message: "Invalid token"});
  });
});
