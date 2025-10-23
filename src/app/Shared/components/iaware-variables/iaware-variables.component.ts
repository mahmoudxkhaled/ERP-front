import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-iaware-variables',
  templateUrl: './iaware-variables.component.html',
  styleUrl: './iaware-variables.component.scss'
})
export class IAwareVariablesComponent {

  constructor(private messageService: MessageService) { }

  iawareVariables = [
    { name: 'Full Name', value: '[User\'s Name]', description: 'The recipient\'s full name, used for personalization.' },
    { name: 'Delation User Full Name', value: '[Delation_User_Name]', description: 'The delation user name, commonly used in greetings.' },
    { name: 'Delation User Email', value: '[Delation_User_Email]', description: 'The delation user email, commonly used in greetings.' },
    { name: 'First Name', value: '[First_Name]', description: 'The recipient\'s first name, commonly used in greetings.' },
    { name: 'Last Name', value: '[Last_Name]', description: 'The recipient\'s last name, often used in formal communication.' },
    { name: 'Email Address', value: '[Email_Address]', description: 'The recipient\'s email address for correspondence or context.' },
    { name: 'Encrypted Email Address', value: '[Encrypted_Email_Address]', description: 'The securely encrypted email address of the recipient, used for communication or contextual reference while preserving privacy.' },
    { name: 'Phone Number', value: '[Phone_Number]', description: 'The recipient\'s contact number for notifications or alerts.' },
    { name: 'Company Id', value: '[Company_Id]', description: 'The Id of the recipient\'s organization for added context.' },
    { name: 'Company Name', value: '[Company_Name]', description: 'The name of the recipient\'s organization for added context.' },
    { name: 'Company Email', value: '[Company_Email]', description: 'The email of the recipient\'s organization for added context.' },
    { name: 'Department Name', value: '[Department]', description: 'The department associated with the recipient\'s role.' },
    { name: 'Date', value: '[Date]', description: 'The current date for time-sensitive content.' },
    { name: 'Verification Code', value: '[Code]', description: 'A unique code used for user verification or authentication purposes.' },
    { name: 'Current Year', value: '[Current-Year]', description: 'The current calendar year, useful for time-sensitive content or copyright notices.' },
    { name: 'Date (Minus 1 Day)', value: '[Date-1]', description: 'The date corresponding to one day prior to today.' },
    { name: 'Date (Minus 2 Days)', value: '[Date-2]', description: 'The date corresponding to two days prior to today.' },
    { name: 'Date (Minus 7 Days)', value: '[Date-7]', description: 'The date corresponding to seven days prior to today.' },
    { name: 'Date (Plus 7 Days)', value: '[Date+7]', description: 'The date corresponding to seven days from today.' },
    { name: 'Date (Plus 1 Day)', value: '[Date+1]', description: 'The date corresponding to one day from today.' },
    { name: 'Date (Plus 2 Days)', value: '[Date+2]', description: 'The date corresponding to two days from today.' },
    { name: 'Time (Minus 1 Hour)', value: '[Time-1]', description: 'The time one hour earlier than the current time.' },
    { name: 'Time (Minus 2 Hours)', value: '[Time-2]', description: 'The time two hours earlier than the current time.' },
    { name: 'Time (Minus 3 Hours)', value: '[Time-3]', description: 'The time three hours earlier than the current time.' },
    { name: 'Time (Minus 12 Hours)', value: '[Time-12]', description: 'The time twelve hours earlier than the current time.' },
    { name: 'Time (Plus 1 Hour)', value: '[Time+1]', description: 'The time one hour later than the current time.' },
    { name: 'Time (Plus 2 Hours)', value: '[Time+2]', description: 'The time two hours later than the current time.' },
    { name: 'Time (Plus 3 Hours)', value: '[Time+3]', description: 'The time three hours later than the current time.' },
    { name: 'Time (Plus 12 Hours)', value: '[Time+12]', description: 'The time twelve hours later than the current time.' },
    { name: 'Time (Minus 5 Minutes)', value: '[Time-m]', description: 'The time five minutes earlier than the current time.' },
    { name: 'Time (Minus 30 Minutes)', value: '[Time-mm]', description: 'The time thirty minutes earlier than the current time.' },
    { name: 'Time (Plus 5 Minutes)', value: '[Time+m]', description: 'The time five minutes later than the current time.' },
    { name: 'Time (Plus 30 Minutes)', value: '[Time+mm]', description: 'The time thirty minutes later than the current time.' },
    { name: 'Portal Url', value: '[Portal-Url]', description: 'The URL of the portal, used for providing direct access links in communications.' },
  ];

  copyVariable(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      // Success message when the variable is copied to the clipboard
      this.messageService.add({
        severity: 'success',
        summary: 'Variable Copied',
        detail: 'The variable has been copied to your clipboard successfully.',
      });
    }).catch((err) => {
      // Error handling if something goes wrong
      this.messageService.add({
        severity: 'error',
        summary: 'Failed to Copy',
        detail: 'There was an issue copying the variable. Please try again.',
      });
    });
  }
}