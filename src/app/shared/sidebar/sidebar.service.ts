import { Injectable } from "@angular/core"
import { BehaviorSubject } from "rxjs"

@Injectable({
  providedIn: "root",
})
export class SidebarService {
  private sidebarExpandedState = new BehaviorSubject<boolean>(true)

  sidebarState$ = this.sidebarExpandedState.asObservable()

  toggle() {
    this.sidebarExpandedState.next(!this.sidebarExpandedState.value)
  }

  expand() {
    this.sidebarExpandedState.next(true)
  }

  collapse() {
    this.sidebarExpandedState.next(false)
  }
}
