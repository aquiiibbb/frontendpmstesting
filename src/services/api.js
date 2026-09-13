import * as mockApi from "./api.mock.js";
import * as realApi from "./api.real.js";

const isRealApi = false;

export const getRooms = (...args) => (isRealApi ? realApi.getRooms(...args) : mockApi.getRooms(...args));
export const getRoomTypes = (...args) => (isRealApi ? realApi.getRoomTypes(...args) : mockApi.getRoomTypes(...args));
export const getRoomsSync = mockApi.getRoomsSync;
export const getRoomTypesSync = mockApi.getRoomTypesSync;
export const getBookingsSync = mockApi.getBookingsSync;
export const saveRoomTypes = (...args) => (isRealApi ? realApi.saveRoomTypes(...args) : mockApi.saveRoomTypes(...args));
export const saveRoomsList = (...args) => (isRealApi ? realApi.saveRoomsList(...args) : mockApi.saveRoomsList(...args));
export const updateRoomHousekeeping = (...args) => (isRealApi ? realApi.updateRoomHousekeeping(...args) : mockApi.updateRoomHousekeeping(...args));

export const getBookings = (...args) => (isRealApi ? realApi.getBookings(...args) : mockApi.getBookings(...args));
export const getBooking = (...args) => (isRealApi ? realApi.getBooking(...args) : mockApi.getBooking(...args));
export const createBooking = (...args) => (isRealApi ? realApi.createBooking(...args) : mockApi.createBooking(...args));
export const createGroupBooking = (...args) => (isRealApi ? realApi.createGroupBooking(...args) : mockApi.createGroupBooking(...args));
export const updateBooking = (...args) => (isRealApi ? realApi.updateBooking(...args) : mockApi.updateBooking(...args));
export const moveBooking = (...args) => (isRealApi ? realApi.moveBooking(...args) : mockApi.moveBooking(...args));
export const cancelBooking = (...args) => (isRealApi ? realApi.cancelBooking(...args) : mockApi.cancelBooking(...args));
export const splitStayBooking = (...args) => (isRealApi ? realApi.splitStayBooking(...args) : mockApi.splitStayBooking(...args));
export const transferBalance = (...args) => (isRealApi ? realApi.transferBalance(...args) : mockApi.transferBalance(...args));
export const addPayment = (...args) => (isRealApi ? realApi.addPayment(...args) : (mockApi.addPayment ? mockApi.addPayment(...args) : mockApi.addSettlement?.(...args)));
export const postFolioPayment = addPayment;
export const addDeposit = (...args) => (isRealApi ? realApi.addDeposit(...args) : mockApi.addDeposit(...args));
export const applyDepositToFolio = (...args) => (isRealApi ? realApi.applyDepositToFolio(...args) : mockApi.applyDepositToFolio(...args));
export const updateDeposit = (...args) => (isRealApi ? realApi.updateDeposit(...args) : mockApi.updateDeposit(...args));
export const deleteDeposit = (...args) => (isRealApi ? realApi.deleteDeposit(...args) : mockApi.deleteDeposit(...args));
export const refundDeposit = (...args) => (isRealApi ? realApi.refundDeposit(...args) : mockApi.refundDeposit(...args));
export const deleteBooking = (...args) => (isRealApi ? realApi.deleteBooking(...args) : mockApi.deleteBooking(...args));
export const resetAllData = (...args) => (isRealApi ? realApi.resetAllData(...args) : mockApi.resetAllData(...args));
export const resetSystemData = (...args) => (isRealApi ? realApi.resetAllData(...args) : mockApi.resetAllData(...args));

export const createRoom = (...args) => (isRealApi ? realApi.createRoom(...args) : mockApi.createRoom?.(...args));
export const updateRoom = (...args) => (isRealApi ? realApi.updateRoom(...args) : mockApi.updateRoom?.(...args));
export const deleteRoom = (...args) => (isRealApi ? realApi.deleteRoom(...args) : mockApi.deleteRoom?.(...args));
export const noShowBooking = mockApi.noShowBooking;
export const addExtra = mockApi.addExtra;
export const addSettlement = mockApi.addSettlement;
export const getAuditLogs = mockApi.getAuditLogs;
export const emailBooking = mockApi.emailBooking;
export const slipPdfUrl = mockApi.slipPdfUrl;
export const regCardPdfUrl = () => "#";
export const folioPdfUrl = () => "#";
export const importBatchBookings = (...args) => (isRealApi ? realApi.importBatchBookings(...args) : mockApi.importBatchBookings(...args));
export const getMasterData = mockApi.getMasterData;

const api = {
  ...mockApi,
  ...realApi,
  resetSystemData: (...args) => (isRealApi ? realApi.resetAllData(...args) : mockApi.resetAllData(...args)),
};

export default api;
