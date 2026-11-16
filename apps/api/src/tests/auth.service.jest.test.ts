import { UserRole } from "../generated/prisma/client";
import { AppError } from "../errors/app-error";
import {
  createAuthService,
  type AuthRepository,
} from "../services/auth.service";

const publicUser = {
  id: "user-1",
  name: "Test User",
  email: "user@example.test",
  role: UserRole.CUSTOMER,
};

function createRepository(): jest.Mocked<AuthRepository> {
  return {
    findByEmail: jest.fn().mockResolvedValue(null),
    findUserForLogin: jest.fn().mockResolvedValue({
      ...publicUser,
      passwordHash: "bcrypt-hash",
    }),
    createUser: jest.fn().mockResolvedValue(publicUser),
  };
}

describe("auth service", () => {
  test("registers after hashing and returns the repository's safe user", async () => {
    const repository = createRepository();
    const hashPassword = jest.fn().mockResolvedValue("bcrypt-hash");
    const service = createAuthService(repository, hashPassword);

    await expect(service.register({
      name: publicUser.name,
      email: publicUser.email,
      password: "ExampleOnly!234",
    })).resolves.toEqual(publicUser);

    expect(hashPassword).toHaveBeenCalledWith("ExampleOnly!234", 12);
    expect(repository.createUser).toHaveBeenCalledWith({
      name: publicUser.name,
      email: publicUser.email,
      passwordHash: "bcrypt-hash",
    });
  });

  test("rejects duplicate registration before hashing", async () => {
    const repository = createRepository();
    repository.findByEmail.mockResolvedValue({ id: "existing-user" });
    const hashPassword = jest.fn();
    const service = createAuthService(repository, hashPassword);

    await expect(service.register({
      name: publicUser.name,
      email: publicUser.email,
      password: "ExampleOnly!234",
    })).rejects.toBeInstanceOf(AppError);
    expect(hashPassword).not.toHaveBeenCalled();
  });

  test("returns a safe user and bearer token for valid login", async () => {
    const repository = createRepository();
    const service = createAuthService(
      repository,
      undefined,
      jest.fn().mockResolvedValue(true),
      jest.fn().mockReturnValue("signed-token"),
    );

    await expect(service.login({
      email: publicUser.email,
      password: "ExampleOnly!234",
    })).resolves.toEqual({
      user: publicUser,
      token: "signed-token",
      tokenType: "Bearer",
    });
  });

  test.each([
    ["unknown user", null],
    ["passwordless user", { ...publicUser, passwordHash: null }],
  ])("rejects login for a %s", async (_scenario, loginUser) => {
    const repository = createRepository();
    repository.findUserForLogin.mockResolvedValue(loginUser);
    const service = createAuthService(repository);

    await expect(service.login({
      email: publicUser.email,
      password: "wrong-password",
    })).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
  });

  test("rejects an incorrect password", async () => {
    const repository = createRepository();
    const service = createAuthService(repository, undefined, jest.fn().mockResolvedValue(false));

    await expect(service.login({
      email: publicUser.email,
      password: "wrong-password",
    })).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
  });
});
