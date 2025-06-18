import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { StatusCodes } from "http-status-codes";
import fs from "fs";

const registerUser = asyncHandler(async (req, res) => {
  let avatarLocalPath;
  let coverLocalPath;
  let avatar;
  let coverImage;

  try {
    const { fullname, email, username, password } = req.body;
    avatarLocalPath = req.files?.avatar?.[0]?.path;
    coverLocalPath = req.files?.coverImage?.[0]?.path;

    if (
      [fullname, email, username, password].some(
        (field) => field?.trim() === "",
      )
    ) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "All fields are required");
    }

    const currentUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (currentUser) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "User with email or username already exists",
      );
    }

    if (!avatarLocalPath) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Avatar file is missing");
    }

    avatar = await uploadOnCloudinary(avatarLocalPath);
    if (coverLocalPath) {
      coverImage = await uploadOnCloudinary(coverLocalPath);
    }

    const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken",
    );

    if (!createdUser) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Something went wrong while registering a user",
      );
    }

    return res.status(StatusCodes.CREATED).json(createdUser);
  } catch (error) {
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id);
    }
    if (avatarLocalPath) {
      fs.unlinkSync(coverLocalPath);
    }
    if (coverLocalPath) {
      fs.unlinkSync(avatarLocalPath);
    }
    throw error;
  }
});

export { registerUser };
