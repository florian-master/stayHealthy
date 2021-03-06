import { browser, by, element } from 'protractor';

export class StayHealthyPage {
  async navigateTo(): Promise<unknown> {
    // Navigate to the home page of the app
    return browser.get(browser.baseUrl);
  }

  async getHeadingText(): Promise<string> {
    // Get the home page heading element reference
    return element(by.css('mat-sidenav-content>mat-toolbar>a')).getText();
  }

  async getTitleText(): Promise<string> {
    // Get the home page title element reference
    return element(by.css('b')).getText();
  }

  async getHomeMessage(): Promise<string> {
    // Get the home page message element reference
    return element(by.css('h3')).getText();
  }

  async getSignUpButton(): Promise<string> {
    // test the home page sign up button element
    const button = element(by.className('signin-btn'));
    return button.getText();
  }

  async getLoginButton(): Promise<string> {
    // test the home page login button element
    const button = element(by.className('login-btn'));
    return button.getText();
  }

  async clickSignUpButton(): Promise<string> {
    // click the home page sign up button
    const button = browser.driver.findElement(by.className('signin-btn'));
    button.click().then( () => {
      browser.waitForAngular();
    });

    const urlChanged = () => {
      return browser.getCurrentUrl().then( url => {
        return url;
      });
    };

    return urlChanged().then((value) => value);
  }

  async clickLoginButton(): Promise<string> {
    // click the home page sign up button
    const button = browser.driver.findElement(by.className('login-btn'));
    button.click().then( () => {
      browser.waitForAngular();
    });

    const urlChanged = () => {
      return browser.getCurrentUrl().then( url => {
        return url;
      });
    };

    return urlChanged().then((value) => value);
  }
}
