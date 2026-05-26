const escapeRoomService = require('./escapeRoom.service');

exports.getRooms = async (req, res) => {
  const rooms = await escapeRoomService.getRooms(req.query);
  res.json({
    status: 'success',
    data: { rooms }
  });
};

exports.getRoomById = async (req, res) => {
  const room = await escapeRoomService.getRoomById(req.params.id);
  res.json({
    status: 'success',
    data: { room }
  });
};

exports.startAttempt = async (req, res) => {
  const attempt = await escapeRoomService.startAttempt(req.user.id, req.params.id);
  res.status(201).json({
    status: 'success',
    data: { attempt }
  });
};

exports.getAttempt = async (req, res) => {
  const attempt = await escapeRoomService.getAttempt(req.params.id, req.user.id);
  res.json({
    status: 'success',
    data: { attempt }
  });
};

exports.requestHint = async (req, res) => {
  const hintResult = await escapeRoomService.requestHint(req.params.id, req.user.id, req.body.puzzle_id);
  res.json({
    status: 'success',
    data: hintResult
  });
};

exports.submitPuzzle = async (req, res) => {
  const result = await escapeRoomService.submitPuzzle(req.params.id, req.user.id, req.body.puzzle_id, req.body.answer);
  res.json({
    status: 'success',
    data: result
  });
};

exports.getMyAttempts = async (req, res) => {
  const attempts = await escapeRoomService.getMyAttempts(req.user.id);
  res.json({
    status: 'success',
    data: { attempts }
  });
};
