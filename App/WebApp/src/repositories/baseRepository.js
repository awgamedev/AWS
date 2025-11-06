import { Model, Document, FilterQuery, UpdateQuery } from "mongoose";

// Interface für grundlegende CRUD-Methoden
export interface IBaseRepository<T extends Document> {
  create(item: Omit<T, "_id" | "createdAt" | "updatedAt">): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(query?: FilterQuery<T>): Promise<T[]>;
  update(id: string, item: UpdateQuery<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

// Generische Basisklasse für alle Repositories
export abstract class BaseRepository<T extends Document>
  implements IBaseRepository<T>
{
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  /**
   * Erstellt ein neues Dokument.
   */
  async create(item: any): Promise<T> {
    const createdItem = new this.model(item);
    return await createdItem.save();
  }

  /**
   * Findet ein Dokument anhand seiner ID.
   */
  async findById(id: string): Promise<T | null> {
    return await this.model.findById(id).exec();
  }

  /**
   * Findet alle Dokumente basierend auf einer optionalen Query.
   */
  async findAll(query: FilterQuery<T> = {}): Promise<T[]> {
    return await this.model.find(query).exec();
  }

  /**
   * Aktualisiert ein Dokument anhand seiner ID.
   */
  async update(id: string, item: UpdateQuery<T>): Promise<T | null> {
    // new: true gibt das aktualisierte Dokument zurück
    return await this.model.findByIdAndUpdate(id, item, { new: true }).exec();
  }

  /**
   * Löscht ein Dokument anhand seiner ID.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.model
      .deleteOne({ _id: id } as FilterQuery<T>)
      .exec();
    return result.deletedCount === 1;
  }
}

// --- Beispiel für eine konkrete Implementierung ---

// Angenommen, du hast ein User-Model (UserSchema und UserModel)

