import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { StatusCodes } from "http-status-codes";
import fs from "fs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const genAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "User don't exists");
    }

    const accessToken = user.genAccessToken();
    const refreshToken = user.genRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Something went wrong while generating access and refresh tokens",
    );
  }
};

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!email) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User don't exists");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await genAccessAndRefreshToken(
    user._id,
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(StatusCodes.OK)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      user: loggedInUser,
      accessToken,
      refreshToken,
    });
});

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

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    },
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(StatusCodes.OK)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(null);
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshtoken;

  if (!incomingRefreshToken) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token is required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET,
    );

    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid refresh token");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await genAccessAndRefreshToken(user._id);

    return res
      .status(StatusCodes.OK)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json({
        accessToken,
        refreshToken: newRefreshToken,
      });
  } catch (error) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Something went wrong while refreshing access token",
    );
  }
});

const changeCurrentPassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Old password is incorrect");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res.status(StatusCodes.OK).json(null);
});

const getCurrentUser = asyncHandler(async (req, res, next) => {
  return res.status(StatusCodes.OK).json(req.user);
});

const updateAccountDetails = asyncHandler(async (req, res, next) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Fullname and email are required",
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true },
  ).select("-password -refreshToken");

  return res.status(StatusCodes.OK).json(user);
});

const updateUserAvatar = asyncHandler(async (req, res, next) => {
  const avatarLocalPath = req.files?.path;

  if (!avatarLocalPath) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "File is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(500, "Something went wrong while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true },
  ).select("-password -refreshToken");

  res.status(200).json(user);
});

const updateUserCoverImage = asyncHandler(async (req, res, next) => {
  const coverLocalPath = req.files?.path;

  if (!coverLocalPath) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "File is required");
  }

  const cover = await uploadOnCloudinary(coverLocalPath);

  if (!cover.url) {
    throw new ApiError(500, "Something went wrong while uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: cover.url,
      },
    },
    { new: true },
  ).select("-password -refreshToken");

  res.status(StatusCodes.OK).json(user);
});

const getUserChannelProfile = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  if (!username) {
    throw new AudioParam(StatusCodes.BAD_REQUEST, "Username is required");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [
                req.user?._id,
                {
                  $map: {
                    input: "$subscribers",
                    as: "s",
                    in: "$$s.subscriber",
                  },
                },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Channel not found");
  }

  return res.status(StatusCodes.OK).json(channel[0]);
});

const getWatchHistory = asyncHandler(async (req, res, next) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId.createFromHexString(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignKey: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                // $arrayElemAt: ["$owner", 0]
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res.status(StatusCodes.OK).json(user[0].watchHistory);
});

export {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
