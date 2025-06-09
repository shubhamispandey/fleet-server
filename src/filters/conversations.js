export function buildConversationSearchPipeline({
  userId,
  search,
  page,
  limit,
}) {
  console.log(userId, search, page, limit);
  const skip = limit === -1 ? 0 : (page - 1) * limit;
  const pipeline = [
    { $match: { participants: userId } },

    // Lookup participants
    // {
    //   $lookup: {
    //     from: "users",
    //     localField: "participants",
    //     foreignField: "_id",
    //     as: "participantsDetails",
    //   },
    // },

    // // Lookup lastMessage
    // {
    //   $lookup: {
    //     from: "messages",
    //     localField: "lastMessage",
    //     foreignField: "_id",
    //     as: "lastMessage",
    //   },
    // },
    // { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },

    // // Lookup sender of the lastMessage
    // {
    //   $lookup: {
    //     from: "users",
    //     localField: "lastMessage.senderId",
    //     foreignField: "_id",
    //     as: "lastMessageSender",
    //   },
    // },
    // {
    //   $unwind: { path: "$lastMessageSender", preserveNullAndEmptyArrays: true },
    // },

    // // Attach sender directly to lastMessage
    // {
    //   $addFields: {
    //     "lastMessage.sender": "$lastMessageSender",
    //   },
    // },

    // Optional search
    // ...(search
    //   ? [
    //       {
    //         $match: {
    //           $or: [
    //             { name: { $regex: search, $options: "i" } },
    //             {
    //               "participantsDetails.name": { $regex: search, $options: "i" },
    //             },
    //             {
    //               "participantsDetails.email": {
    //                 $regex: search,
    //                 $options: "i",
    //               },
    //             },
    //           ],
    //         },
    //       },
    //     ]
    //   : []),

    { $sort: { lastActivityAt: -1 } },
    ...(limit !== -1 ? [{ $skip: skip }, { $limit: limit }] : []),
  ];

  return pipeline;
}
