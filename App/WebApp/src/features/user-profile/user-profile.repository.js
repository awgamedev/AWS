const UserProfile = require("./user-profile.model");

/**
 * Repository for UserProfile operations (read-only public usage)
 */
class UserProfileRepository {
  async findByUserId(userId) {
    try {
      return await UserProfile.findOne({ userId }).lean();
    } catch (error) {
      throw new Error(`Error finding user profile: ${error.message}`);
    }
  }

  async create(profileData) {
    try {
      const profile = new UserProfile(profileData);
      return await profile.save();
    } catch (error) {
      throw new Error(`Error creating user profile: ${error.message}`);
    }
  }

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

  async deleteByUserId(userId) {
    try {
      return await UserProfile.findOneAndDelete({ userId }).lean();
    } catch (error) {
      throw new Error(`Error deleting user profile: ${error.message}`);
    }
  }

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
