import { MAX_AGE, MIN_AGE } from "@/constants/validators"

export default class DateUtils {
  public static get getToday(): Date {
    return new Date()
  }

  public static get minAvailableDate(): Date {
    return new Date(
      this.getToday.getFullYear() - MAX_AGE,
      this.getToday.getMonth(),
      this.getToday.getDate()
    )
  }

  public static get maxAvailableDate(): Date {
    return new Date(
      this.getToday.getFullYear() - MIN_AGE,
      this.getToday.getMonth(),
      this.getToday.getDate()
    )
  }
}
