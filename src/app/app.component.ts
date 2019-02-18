import { Component, OnInit, ViewEncapsulation  } from '@angular/core';

import { of, interval  } from 'rxjs';
import { webSocket } from "rxjs/webSocket";
import { delay } from 'rxjs/operators';

import { TdLoadingService, LoadingType, LoadingMode } from '@covalent/core/loading';
import { TdDialogService } from '@covalent/core/dialogs';
import { tdFadeInOutAnimation , tdHeadshakeAnimation } from '@covalent/core/common';

import { faIdCard, faArrowCircleLeft, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

interface Message {
  type: string;
  payload?: any;
  service?: string;
  message?: string;
}

interface MessageEntry {
  text: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'attendance-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    tdFadeInOutAnimation ,
    tdHeadshakeAnimation,
  ],
})
export class AppComponent {
  question = faQuestionCircle;
  icons = [
    faIdCard,
    faArrowCircleLeft,
  ];
  pulse = false;
  debug = false;
  messages: MessageEntry[] = [];
  time = new Date();
  public ready_states = {
    api: false,
    websocket: false,
  };


  constructor(
    private _loadingService: TdLoadingService
  ) {
    this._loadingService.create({
      name: 'loader',
      type: LoadingType.Circular,
      mode: LoadingMode.Indeterminate,
      color: 'accent',
    });
  }

  ngOnInit(): void {
    this._loadingService.register('loader');
    const subject = webSocket("ws://localhost:6789");
    subject.subscribe((val: Message) => {
      this.processMessage(val);
    });
    interval(1000).subscribe(() => {this.pulse = !this.pulse});
    interval(1000).subscribe(() => {this.time = new Date()});
  }

  pushMessageEntry(text: string, icon: string, color: string) {
      if (this.messages.length > 2) {
        this.messages.shift()
      }
      this.messages.push({
        text: text,
        icon: icon,
        color: color,
      });
      of(true).pipe(
        delay(5000)
      ).subscribe(() => {
        this.messages.shift();
      })
  }

  processMessage(message:Message): void {
    const handler = `${message.type}Handler`;
    if (handler in this) {
      this[handler](message);
    }
  }

  readyHandler(message: Message) {
    if (this.ready_states.hasOwnProperty(message.service)) {
      this.ready_states[message.service] = true;
    }
    if (!Object.values(this.ready_states).includes(false)) {
      // Backend is ready, unlock application
      this._loadingService.resolve('loader');
    }
  }

  unreadyHandler(message: Message) {
    if (this.ready_states.hasOwnProperty(message.service)) {
      this.ready_states[message.service] = false;
    }
    if (Object.values(this.ready_states).includes(false)) {
      // Backend is ready, unlock application
      this._loadingService.register('loader');
    }
  }

  requestHandler(message: Message) {
    this._loadingService.register('loader');
  }

  responseHandler(message: Message) {
    message.payload.status.forEach((text) => {
      this.pushMessageEntry(text, 'check_circle_outline', 'accent');
    });

    this._loadingService.resolve('loader');
  }

  errorHandler(message: Message) {
      this._loadingService.resolve('loader');
      this.pushMessageEntry(message.message, 'report_problem', 'warn');
  }

  debugEnable() {
    this.debug = true;
      of(true).pipe(
        delay(10000)
      ).subscribe(() => {
        this.debug = false;
      })
  }
}
