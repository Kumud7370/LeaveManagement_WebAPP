import { Pipe, type PipeTransform } from "@angular/core"

@Pipe({
  name: "max",
  standalone: true,
})
export class MaxPipe implements PipeTransform {
  transform(value: number[]): number {
    if (!value || value.length === 0) {
      return 0
    }
    return Math.max(...value)
  }
}
