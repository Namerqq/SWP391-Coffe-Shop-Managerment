/**
 * enum/
 * Chứa các giá trị hằng số dùng chung: giới tính, trạng thái,...
 */

const GENDER = Object.freeze({
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
});

const STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  DELETED: "DELETED",
});

module.exports = { GENDER, STATUS };
