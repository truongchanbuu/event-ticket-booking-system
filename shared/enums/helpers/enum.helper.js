export default class EnumHelper {
  static enumToString(enumObj, separator = ", ") {
    return Object.values(enumObj).join(separator);
  }
}
