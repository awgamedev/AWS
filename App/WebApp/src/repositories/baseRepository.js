class BaseRepository {
  /**
   * @param {mongoose.Model} model - Das Mongoose-Model, mit dem dieses Repository arbeitet.
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * Erstellt ein neues Dokument.
   * @param {Object} item - Das Objekt mit den Daten für das neue Dokument.
   * @returns {Promise<Object>} Das erstellte und in der DB gespeicherte Dokument.
   */
  async create(item) {
    const createdItem = new this.model(item);
    return await createdItem.save();
  }

  /**
   * Findet ein Dokument anhand seiner ID.
   * @param {string} id - Die ID des Dokuments.
   * @returns {Promise<Object | null>} Das gefundene Dokument oder null.
   */
  async findById(id) {
    return await this.model.findById(id).exec();
  }

  /**
   * Findet alle Dokumente basierend auf einer optionalen Query.
   * @param {Object} [query={}] - Ein Mongoose FilterQuery-Objekt.
   * @returns {Promise<Array<Object>>} Eine Liste von Dokumenten.
   */
  async findAll(query = {}) {
    return await this.model.find(query).exec();
  }

  /**
   * Aktualisiert ein Dokument anhand seiner ID.
   * @param {string} id - Die ID des Dokuments.
   * @param {Object} item - Ein Mongoose UpdateQuery-Objekt mit den zu aktualisierenden Feldern.
   * @returns {Promise<Object | null>} Das aktualisierte Dokument oder null.
   */
  async update(id, item) {
    // new: true gibt das aktualisierte Dokument zurück
    return await this.model.findByIdAndUpdate(id, item, { new: true }).exec();
  }

  /**
   * Löscht ein Dokument anhand seiner ID.
   * @param {string} id - Die ID des Dokuments.
   * @returns {Promise<boolean>} True, wenn ein Dokument gelöscht wurde, ansonsten False.
   */
  async delete(id) {
    const result = await this.model.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }
}

// Export der Klasse, damit sie in anderen Dateien importiert werden kann.
module.exports = BaseRepository;
