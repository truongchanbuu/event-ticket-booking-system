import { MAX_AGE, MIN_AGE } from "@/constants/validators"

export default class DateUtils {
  public static get today(): Date {
    return new Date()
  }

  public static get minAvailableDate(): Date {
    return new Date(
      this.today.getFullYear() - MAX_AGE,
      this.today.getMonth(),
      this.today.getDate()
    )
  }

  public static get maxAvailableDate(): Date {
    return new Date(
      this.today.getFullYear() - MIN_AGE,
      this.today.getMonth(),
      this.today.getDate()
    )
  }
}
