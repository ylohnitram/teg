let email_user = "";
let email_token = "";
let timer = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateEmail") {
    fetch('https://api.guerrillamail.com/ajax.php?f=get_email_address&scramble=true')
      .then(response => response.json())
      .then(data => {
        email_user = data.email_user;
        email_token = data.sid_token;
        let scrambledEmail = data.email_addr;
        let originalEmail = data.alias;

        // Uložit email a token do storage a vymazat staré emaily
        chrome.storage.local.set({ email_user, email_token, email_addr: scrambledEmail, original_email_addr: originalEmail, emails: [], email_created_at: Date.now() }, () => {
          sendResponse({ email: scrambledEmail });
        });

        // Nastavit časovač na 45 minut
        if (timer) {
          clearTimeout(timer);
        }
        timer = setTimeout(() => {
          chrome.storage.local.remove(['email_user', 'email_token', 'email_addr', 'original_email_addr', 'emails', 'email_created_at'], () => {
            chrome.action.setBadgeText({ text: '☠' });
            chrome.action.setBadgeBackgroundColor({ color: '#000000' });
          });
        }, 45 * 60 * 1000);
      })
      .catch(error => {
        console.error('Error:', error);
        sendResponse({ email: null });
      });
    return true; // Indicate that we will respond asynchronously
  } else if (request.action === "checkEmails") {
    chrome.storage.local.get(['email_token', 'emails'], (result) => {
      if (result.email_token) {
        fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&sid_token=${result.email_token}&seq=0`)
          .then(response => response.json())
          .then(data => {
            // Odstranit poslední automaticky generovaný email a úvodní email od Guerrilla Mail
            const newEmails = data.list.slice(0, -1).filter(email => email.mail_from !== "no-reply@guerrillamail.com");
            if (newEmails.length > 0) {
              const email = newEmails[0];
              fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&sid_token=${result.email_token}&email_id=${email.mail_id}`)
                .then(response => response.json())
                .then(emailDetails => {
                  email.mail_body = emailDetails.mail_body;
                  email.mail_body_html = emailDetails.mail_body_html;
                  sendResponse({ emails: [email] });
                  // Uložit pouze první email do storage
                  chrome.storage.local.set({ emails: [email] });
                  // Nastavit badge ikonu
                  chrome.action.setBadgeText({ text: '★' });
                  chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
                });
            } else {
              sendResponse({ emails: [] });
            }
          })
          .catch(error => {
            console.error('Error:', error);
            sendResponse({ emails: [] });
          });
      } else {
        sendResponse({ emails: [] });
      }
    });
    return true; // Indicate that we will respond asynchronously
  } else if (request.action === "clearBadge") {
    chrome.action.setBadgeText({ text: '' });
  }
});

// Nastavení pravidelné kontroly emailů každých 10 sekund
setInterval(() => {
  chrome.storage.local.get(['email_token'], (result) => {
    if (result.email_token) {
      fetch(`https://api.guerrillamail.com/ajax.php?f=check_email&sid_token=${result.email_token}&seq=0`)
        .then(response => response.json())
        .then(data => {
          // Odstranit poslední automaticky generovaný email a úvodní email od Guerrilla Mail
          const newEmails = data.list.slice(0, -1).filter(email => email.mail_from !== "no-reply@guerrillamail.com");
          if (newEmails.length > 0) {
            const email = newEmails[0];
            fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&sid_token=${result.email_token}&email_id=${email.mail_id}`)
              .then(response => response.json())
              .then(emailDetails => {
                email.mail_body = emailDetails.mail_body;
                email.mail_body_html = emailDetails.mail_body_html;
                chrome.storage.local.set({ emails: [email] }, () => {
                  // Notify the popup of new emails
                  chrome.runtime.sendMessage({ action: 'newEmails', emails: [email] });
                  // Nastavit badge ikonu
                  chrome.action.setBadgeText({ text: '★' });
                  chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
                });
              });
          }
        })
        .catch(error => {
          console.error('Error:', error);
        });
    }
  });
}, 10000);
