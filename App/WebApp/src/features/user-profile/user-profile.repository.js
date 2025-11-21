const UserProfile = require("./user-profile.model");

/**
 * Repository for UserProfile operations
 * Handles all database interactions for user profiles
 */
class UserProfileRepository {
  /**
   * Find a user profile by user ID
   * @param {string} userId - The user's ID
   * @returns {Promise<Object|null>} The user profile or null
   */
  async findByUserId(userId) {
    try {
      return await UserProfile.findOne({ userId }).lean();
    } catch (error) {
      throw new Error(`Error finding user profile: ${error.message}`);
    }
  }

  /**
   * Create a new user profile
   * @param {Object} profileData - The profile data
   * @returns {Promise<Object>} The created profile
   */
  async create(profileData) {
    try {
      const profile = new UserProfile(profileData);
      return await profile.save();
    } catch (error) {
      throw new Error(`Error creating user profile: ${error.message}`);
    }
  }

  /**
   * Update an existing user profile
   * @param {string} userId - The user's ID
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object|null>} The updated profile or null
   */
  async updateByUserId(userId, updateData) {
    try {
      return await UserProfile.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();
    } catch (error) {
      throw new Error(`Error updating user profile: ${error.message}`);
    }
  }

  /**
   * Get or create a user profile
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} The user profile
   */
  async getOrCreate(userId) {
    try {
      let profile = await this.findByUserId(userId);

      if (!profile) {
        profile = await this.create({ userId });
      }

      return profile;
    } catch (error) {
      throw new Error(
        `Error getting or creating user profile: ${error.message}`
      );
    }
  }

  /**
   * Delete a user profile by user ID
   * @param {string} userId - The user's ID
   * @returns {Promise<Object|null>} The deleted profile or null
   */
  async deleteByUserId(userId) {
    try {
      return await UserProfile.findOneAndDelete({ userId }).lean();
    } catch (error) {
      throw new Error(`Error deleting user profile: ${error.message}`);
    }
  }

  /**
   * Update profile picture
   * @param {string} userId - The user's ID
   * @param {string} base64Image - The base64 encoded image
   * @returns {Promise<Object|null>} The updated profile or null
   */
  async updateProfilePicture(userId, base64Image) {
    try {
      return await UserProfile.findOneAndUpdate(
        { userId },
        { $set: { profilePictureBase64: base64Image } },
        { new: true, upsert: true, runValidators: true }
      ).lean();
    } catch (error) {
      throw new Error(`Error updating profile picture: ${error.message}`);
    }
  }
}

module.exports = new UserProfileRepository();
