const {google} = require("googleapis")
const config=require("./config.js")
const oAuth2=google.auth.OAuth2;


process.env.NODE_INVALID_UTF8_STRING = 'true';

const OAuth2_client=new oAuth2(config.clientid,config.clientsec)

OAuth2_client.setCredentials({
  refresh_token:config.refreshtoken
})

// Create a Gmail API client
const gmail = new google.gmail({
  version: 'v1',
  auth: OAuth2_client
});


// MarkAsUnread once replied..
function markAsUnread(auth, messageId) {
  const gmail = google.gmail({ version: 'v1', auth });

  gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
          removeLabelIds: ['UNREAD'],
      },
  }, (err, res) => {
      if (err) return console.log('The API returned an error:', err.message);

      console.log('Email marked as unread:', res.data);
  });
}

// Get a list of new messages
async function getNewMessages() {
  const response = await gmail.users.messages.list({
    userId: 'me',

    q: 'is:unread'
  });
   

  return response.data.messages;
}


async function sendReply(messageId, body) {
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: body
    },
    threadId: messageId
  });

  return response.data.id;
}

// ---------TAG EMAIL---------------------
async  function tagEmail(messageId, labelId) {
  await  gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    addLabelIds: [labelId]
  });
}
//--------------GET LABEL ID USING LABLE NAME--------------
async function getLabelId(auth, labelName,message) {
  const gmail = google.gmail({ version: 'v1', auth });

  try {
      const response = await gmail.users.labels.list({
          userId: 'me',
      });

      const labels = response.data.labels;
      const targetLabel = labels.find(label => label.name === labelName);

      if (targetLabel) {
          console.log(`Label ID for '${labelName}': ${targetLabel.id}`);
          tagEmail(message.id, targetLabel.id);

          return targetLabel.id;
      } else {
          console.log(`Label '${labelName}' not found.`);
          return null;
      }
  } catch (error) {
      console.error('Error retrieving labels:', error.message);
      return null;
  }
}


async function main() {
  while (true) {
 
    const messages = await getNewMessages();


   
    for (const message of messages) {
      
      
      const body = await gmail.users.messages.get({
        userId: 'me',
        id: message.id
      }).then(response => {

      const emailLines = [
        `To: ${response.data.payload.headers[6].value}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        'Content-Transfer-Encoding: 7bit',
        `Subject: ${'Mail from rajesh'}`,
        '',
        "Thankyou for you mail..Consider this as a reply"
    ];
    const email = emailLines.join('\r\n');
    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
     
    
    
    return encodedEmail;
      });


getLabelId(OAuth2_client,'myreplies',message);

markAsUnread(OAuth2_client,message.id);

      await sendReply(message.id, body);
    }
    await new Promise(resolve => setTimeout(resolve, 60 * 1000));
  }
}
main();