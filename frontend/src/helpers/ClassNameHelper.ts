export default class ClassNameHelper {
  public static getDefaultClasses(input: object): string {
    return Object.values(input).join(" ")
  }
}
