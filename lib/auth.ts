import { account, ID } from "./appwrite";
import { Models } from "appwrite";

export type User = Models.User<Models.Preferences>;

export async function login(email: string, password: string) {
  return account.createEmailPasswordSession(email, password);
}

export async function register(email: string, password: string, name: string) {
  await account.create(ID.unique(), email, password, name);
  return login(email, password);
}

export async function logout() {
  return account.deleteSession("current");
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function updateName(name: string) {
  return account.updateName(name);
}

export async function updateEmail(email: string, password: string) {
  return account.updateEmail(email, password);
}

export async function updatePassword(newPassword: string, oldPassword: string) {
  return account.updatePassword(newPassword, oldPassword);
}

export async function updatePhone(phone: string, password: string) {
  return account.updatePhone(phone, password);
}
