// src/repositories/UserRepository.ts

import { UserModel, IUser } from "../models/User";
import { BaseRepository, IBaseRepository } from "./BaseRepository"; // Importiere deine Basisklasse

// 1. Definiere ein spezifisches Interface für das Repository (optional, aber gut für DI/Mocking)
export interface IUserRepository extends IBaseRepository<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

// 2. Implementiere das Repository
export class UserRepository
  extends BaseRepository<IUser>
  implements IUserRepository
{
  constructor() {
    // Rufe den Konstruktor der Basisklasse mit dem Mongoose Model auf
    super(UserModel);
  }

  /**
   * Eine spezifische Methode, um einen Benutzer anhand der E-Mail-Adresse zu finden.
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return await this.model.findOne({ email }).exec();
  }

  // Die Methoden create, findById, findAll, update, delete sind automatisch verfügbar
  // durch die Vererbung von BaseRepository.
}
