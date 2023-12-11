import jwt from "jsonwebtoken";
import {Timestamp} from "firebase-admin/firestore";
import generateToken from "../src/services/generateToken";
import {
  sendMachineAddedEmail,
  emailConfirmationEmail,
} from "../src/services/utils/userSecurityEmails";
import {mockFirebaseAdmin} from "./utils/testing.utils";
const Sentry = require("@sentry/serverless");

// TODO Move to setup file
require("dotenv").config({path: ".env.test"});

jest.mock("../src/services/utils/userSecurityEmails", () => ({
  sendMachineAddedEmail: jest.fn(),
  emailConfirmationEmail: jest.fn(),
}));
const recentlyConfirmed = {toDate: jest.fn(() => new Date(Date.now()))};

jest.mock("@sentry/serverless", () => ({
  captureException: jest.fn(),
}));

let httpResponseObject;
let httpRequestObject;

describe("generateToken", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.JWT_SECRET = "SECRET";

    httpRequestObject = {
      body: {
        machineIdentifier: "my-machine-id",
        licenseKey: "TEST_KEY",
      },
    };
    httpResponseObject = {
      status: jest.fn(() => httpResponseObject),
      send: jest.fn(),
    };
  });

  it("should return 500 if JWT_SECRET is not set", async () => {
    delete process.env.JWT_SECRET;

    await generateToken(
      httpRequestObject,
      httpResponseObject,
      mockFirebaseAdmin({}),
    );

    expect(httpResponseObject.status).toHaveBeenCalledWith(500);
    expect(httpResponseObject.send).toHaveBeenCalledWith({
      error: "Server configuration invalid",
    });
  });

  it("should return 401 if license key does not exist", async () => {
    await generateToken(
      httpRequestObject,
      httpResponseObject,
      mockFirebaseAdmin(null, "1234"),
    );
    expect(httpResponseObject.send).toHaveBeenCalledWith({
      error: "Invalid license key",
    });
    expect(httpResponseObject.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if license key is inactive", async () => {
    await generateToken(
      httpRequestObject,
      httpResponseObject,
      mockFirebaseAdmin({status: "DEACTIVATED"}),
    );
    expect(httpResponseObject.send).toHaveBeenCalledWith({
      error: "Invalid license key",
    });
    expect(httpResponseObject.status).toHaveBeenCalledWith(401);
  });

  it("should return 401 if license key has no email", async () => {
    await generateToken(
      httpRequestObject,
      httpResponseObject,
      mockFirebaseAdmin({status: "ACTIVE"}),
    );
    expect(httpResponseObject.send).toHaveBeenCalledWith({
      error: "Email and/or machine ID not found",
    });
    expect(httpResponseObject.status).toHaveBeenCalledWith(401);
  });

  it("should return 403 if max activations exceeded", async () => {
    await generateToken(
      httpRequestObject,
      httpResponseObject,
      mockFirebaseAdmin({
        status: "ACTIVE",
        email: "test@example.com",
        activations: 3,
        machines: [],
        maxActivations: 3,
      }),
    );
    expect(httpResponseObject.status).toHaveBeenCalledWith(403);
    expect(httpResponseObject.send).toHaveBeenCalledWith({
      error: "Max activations exceeded",
    });
  });

  it("should return 403 if license has expired", async () => {
    const currentDate = new Date();
    const oldExpirationDate = new Date(currentDate.getTime() - 60 * 1000);

    const licenseData = {
      status: "ACTIVE",
      machines: [],
      email: "test@example.com",
      expiresAt: Timestamp.fromDate(oldExpirationDate),
    };

    await generateToken(
      httpRequestObject,
      httpResponseObject,
      mockFirebaseAdmin(licenseData),
    );
    expect(httpResponseObject.send).toHaveBeenCalledWith({
      error: "Expired license key",
    });
  });

  it("should send token and user machine added notifications if machine already registered", async () => {
    jest.spyOn(jwt, "sign").mockReturnValue("signedToken");
    const registeredMachine = "my-machine-id";
    const licenseData = {
      status: "ACTIVE",
      activations: 0,
      maxActivations: 3,
      email: "test@example.com",
      machines: [registeredMachine],
      emailConfirmedAt: {toDate: jest.fn(() => new Date(Date.now()))},
    };

    await generateToken(
      httpRequestObject,
      httpResponseObject,
      mockFirebaseAdmin(licenseData),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      new Error("Machine already activated for key TEST_KEY"),
    );
    expect(httpResponseObject.status).toHaveBeenCalledWith(401);
  });

  it("should send token if new machine is added", async () => {
    const newMachine = "new-machine-id";
    jest
      .spyOn(jwt, "sign")
      .mockReturnValueOnce("signedAccessToken")
      .mockReturnValue("signedRefreshToken");
    const adminMock = mockFirebaseAdmin({
      status: "ACTIVE",
      activations: 0,
      maxActivations: 3,
      email: "test@example.com",
      machines: [newMachine],
      emailConfirmedAt: recentlyConfirmed,
    });

    await generateToken(httpRequestObject, httpResponseObject, adminMock);
    expect(sendMachineAddedEmail).toHaveBeenCalled();
    expect(emailConfirmationEmail).not.toHaveBeenCalled();
    expect(httpResponseObject.send).toHaveBeenCalledWith({
      refreshToken: "signedRefreshToken",
      accessToken: "signedAccessToken",
    });
  });

  xit("should return 402 if new machine is added with old email confirmation", async () => {
    const newMachine = "new-machine-id";

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setTime(twoWeeksAgo.getTime() - 14 * 24 * 60 * 60 * 1000);
    const adminMock = mockFirebaseAdmin({
      status: "ACTIVE",
      activations: 0,
      maxActivations: 3,
      email: "test@example.com",
      machines: [newMachine],
      emailConfirmedAt: {toDate: jest.fn(() => twoWeeksAgo)},
    });

    await generateToken(httpRequestObject, httpResponseObject, adminMock);
    expect(sendMachineAddedEmail).not.toHaveBeenCalled();
    expect(emailConfirmationEmail).toHaveBeenCalled();
    expect(httpResponseObject.send).toHaveBeenCalledWith({
      message: "Confirmation Required. Email confirmation sent",
    });
    expect(httpResponseObject.status).toHaveBeenCalledWith(403);
  });

  it("should add new machine and return token", async () => {
    const mockSign = jest
      .spyOn(jwt, "sign")
      .mockReturnValueOnce("signedAccessToken")
      .mockReturnValue("signedRefreshToken");

    await generateToken(
      httpRequestObject,
      httpResponseObject,
      mockFirebaseAdmin({
        status: "ACTIVE",
        activations: 0,
        maxActivations: 3,
        plan: "TRIAL",
        email: "test@example.com",
        machines: ["new-machine-id"],
        emailConfirmedAt: recentlyConfirmed,
      }),
    );
    //   // Assert JWT sign call
    expect(mockSign).toHaveBeenCalledTimes(2);
    expect(mockSign).toHaveBeenCalledWith(
      {
        email: "test@example.com",
        iss: process.env.ISS,
        plan: "TRIAL",
        tokenIdentifier: expect.any(String),
        userId: "dGVzdEBleGFtcGxlLmNvbQ==-my-machine",
        version: "1.0.0",
      },
      "SECRET",
      {algorithm: "HS256", expiresIn: "1h"},
    );
    expect(mockSign).toHaveBeenLastCalledWith(
      {
        userId: "dGVzdEBleGFtcGxlLmNvbQ==-my-machine",
        sessionId: "NEW_SESSION_ID",
        iss: process.env.ISS,
        version: "1.0.0",
      },
      "SECRET",
      {algorithm: "HS256"},
    );
    expect(sendMachineAddedEmail).toHaveBeenCalled();
    expect(emailConfirmationEmail).not.toHaveBeenCalled();
    expect(httpResponseObject.send).toHaveBeenCalledWith({
      accessToken: "signedAccessToken",
      refreshToken: "signedRefreshToken",
    });
    expect(httpResponseObject.status).toHaveBeenCalledWith(200);
  });
});
