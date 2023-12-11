import {createLicenseKey} from "../src/services/createLicenseKey";

const createFirestoreMock = () => {
  return {
    firestore: jest.fn(() => ({
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn(),
    })),
  };
};

process.env.GCLOUD_PROJECT = "my-project-id";
jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-uuidv4"),
}));

jest.mock("@sentry/serverless", () => ({
  captureException: jest.fn(),
}));

import {
  createLicense,
  createWelcomeEmail,
} from "../src/services/utils/createLicenseKeyUtils";
jest.mock("../src/services/utils/createLicenseKeyUtils", () => ({
  createLicense: jest.fn(),
  createWelcomeEmail: jest.fn(),
}));

describe("createLicenseKey", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create license key and link to user with email", async () => {
    const mockUser = {
      email: "test@example.com",
    };
    console.log(createFirestoreMock());
    await createLicenseKey(mockUser, createFirestoreMock());

    expect(createLicense).toHaveBeenCalledWith(
      expect.any(Object),
      "mock-uuidv4",
      "test@example.com",
    );
    expect(createWelcomeEmail).toHaveBeenCalledWith(
      expect.any(Object),
      "mock-uuidv4",
      "test@example.com",
    );
  });

  it("should throw an error if user has no email", async () => {
    await expect(createLicenseKey({}, createFirestoreMock())).rejects.toThrow(
      "email not present in user",
    );
  });
});
