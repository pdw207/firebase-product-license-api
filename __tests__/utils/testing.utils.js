export const mockFirebaseAdmin = (data) => {
  return {
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        where: jest.fn((key, _condition, id) => ({
          get: jest.fn(() => ({
            data: jest.fn(() => data),
            empty: !data[key].includes(id),
          })),
        })),
        doc: jest.fn(() => ({
          update: jest.fn(),
          set: jest.fn(),
          delete: jest.fn(),
          get: jest.fn(() => ({
            data: jest.fn(() => data), // mock data to return
          })),
        })),
        add: jest.fn(() => ({id: "NEW_SESSION_ID"})),
      })),
    })),
  };
};
