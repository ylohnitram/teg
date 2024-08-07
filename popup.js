document.getElementById('generateEmail').addEventListener('click', function() {
  chrome.runtime.sendMessage({ action: 'generateEmail' }, function(response) {
    if (response && response.email) {
      const emailElement = document.getElementById('email');
      emailElement.innerText = response.email;
      emailElement.style.cursor = 'pointer';
      emailElement.addEventListener('click', copyToClipboard);

      // Vymazat staré emaily z úložiště
      chrome.storage.local.set({ emails: [] }, () => {
        displayEmails([]);
      });
    } else {
      document.getElementById('email').innerText = "Failed to generate email.";
    }
  });
});

function displayEmails(emails) {
  let emailsDiv = document.getElementById('emails');
  emailsDiv.innerHTML = "";
  if (emails && emails.length > 0) {
    const email = emails[0];
    let emailElement = document.createElement('div');
    emailElement.classList.add('email-item');
    emailElement.innerHTML = `
      <strong>From:</strong> ${email.mail_from}<br>
      <strong>Subject:</strong> ${email.mail_subject}<br>
      <div class="email-body">${email.mail_body_html || email.mail_body}</div>`;
    emailsDiv.appendChild(emailElement);

    // Přidáme listener pro odkazy, aby se otevíraly v nové záložce
    emailElement.querySelectorAll('a').forEach(anchor => {
      anchor.addEventListener('click', function(event) {
        event.preventDefault();
        chrome.tabs.create({ url: anchor.href });
      });
    });
  } else {
    emailsDiv.innerText = "No emails found.";
  }
}

function copyToClipboard() {
  const emailElement = document.getElementById('email');
  const emailText = emailElement.innerText;
  navigator.clipboard.writeText(emailText).then(() => {
    emailElement.innerText = "Copied!";
    setTimeout(() => {
      emailElement.innerText = emailText;
    }, 2000);
  });
}

// Při načtení popupu zobrazit aktuální email a případné emaily
document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.sendMessage({ action: 'clearBadge' });
  chrome.storage.local.get(['email_addr', 'emails'], (result) => {
    if (result.email_addr) {
      const emailElement = document.getElementById('email');
      emailElement.innerText = result.email_addr;
      emailElement.style.cursor = 'pointer';
      emailElement.addEventListener('click', copyToClipboard);
      displayEmails(result.emails || []);
    }
  });
});

// Listen for new email notifications
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'newEmails') {
    displayEmails(request.emails);
  }
});
