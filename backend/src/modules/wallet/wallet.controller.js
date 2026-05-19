const walletService = require('./wallet.service');
const apiResponse = require('../../utils/apiResponse');

class WalletController {
  async getWallet(req, res) {
    const wallet = await walletService.getWallet(req.user._id);
    return apiResponse.success(res, wallet);
  }

  async getTransactions(req, res) {
    const { transactions, total, page, limit } = await walletService.getTransactions(
      req.user._id,
      req.query
    );
    return apiResponse.paginated(res, transactions, page, limit, total);
  }

  async adminTopUp(req, res) {
    const { user_id, amount, reason } = req.body;
    const wallet = await walletService.adminTopUp(user_id, amount, req.user._id, reason);
    return apiResponse.success(res, wallet);
  }
}

module.exports = new WalletController();
