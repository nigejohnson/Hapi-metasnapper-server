'use strict';
// import nodemailer from 'nodemailer';
const nodemailer = require('nodemailer');
const Hapi = require('@hapi/hapi');

const currentPort = process.env.PORT || 5000;

const sendEmail = true;

const mailuser = process.env.MAILUSER;
const mailfrompwd = process.env.MAILFROMPWD;
const mailfrom = process.env.MAILFROM;

var defaultmailto = process.env.MAILTO; // Setting the default mailto address
var mailto;

// Yahoo or yahoo should work as the service name for yahoo
const transporter = nodemailer.createTransport({
  service: 'SendGrid', // was gmail , but kept blocking
  auth: {
    user: mailuser,
    pass: mailfrompwd
  }
});

function sendAnEmail (item) {
  console.log('Mail to is: ' + mailto);
  var mailOptions = {
    from: mailfrom,
    to: mailto,
    subject: item.title,
    // subject: item.title,
    text: item.note + '\n' + 'At time: ' + item.datetime + '\n' + 'At location: ' + item.latitude + ' latitude and ' + item.longitude + ' longitude.',
    // text: 'Field Notes test message'
    attachments: [
      { // encoded image as an attachment
        path: item.photoasdataurl

      }
    ]

  };

  // Remove the attachments if the photo is empty/absent
  if (item.photoasdataurl === '') {
    delete mailOptions.attachments;
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      handleEmailingError(item, error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

function handleEmailingError (item, error) {
  // As nodemailer is inherently asynchronous we need an asynchronous way to alert any errors
  // For now emailing, which is imperfect if the error is actually at our smtp service!
  console.log('Attempting to send the emailing error and email content to: ' + defaultmailto);
  var mailOptions = {
    from: mailfrom,
    to: defaultmailto,
    subject: 'ERROR sending MetaSnap: ' + item.title + ' to email address ' + mailto,
    // subject: item.title,
    text: 'The following error ' + error + ' occurred when sending the followng snap from ' + mailfrom + ' to ' + mailto + ':\n' + item.note + '\n' + 'At time: ' + item.datetime + '\n' + 'At location: ' + item.latitude + ' latitude and ' + item.longitude + ' longitude.',
    // text: 'Field Notes test message'
    attachments: [
      { // encoded image as an attachment
        path: item.photoasdataurl

      }
    ]

  };

  // Remove the attachments if the photo is empty/absent
  if (item.photoasdataurl === '') {
    delete mailOptions.attachments;
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      console.log('Unable to forward on the error and the failing email. The problem may be with the SMTP service. Giving up.');
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

const init = async () => {
  const server = Hapi.server({
    port: currentPort,
    host: 'localhost',
    routes: {
      cors: {
        origin: ['*'], // an array of origins or 'ignore'
        additionalHeaders: ['X-CUSTOM', 'Content-Type', 'configured-mailto']
      }
    }
  });

  /*
  app.use((req, res, next) => {
  res.setHeader('Content-Type', 'text/plain');
  // enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'X-CUSTOM, Content-Type, configured-mailto');
  next();
}); */

  /* server.route({
    config: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['X-CUSTOM', 'Content-Type', 'configured-mailto']
      }
    },

    method: 'GET',
    path: '/',
    handler: (request, h) => {
      return 'Hello World!';
    },

    method: 'GET',
    path: '/',
    handler: (request, h) => {
      return 'Hello World!';
    }
  }); */

  // add each route
  server.route([
    {
      method: 'GET',
      path: '/',
      handler: (request, h) => {
        return 'MetaSnapper server running and HAPI!';
      }
    },
    {
      method: 'POST',
      path: '/',
      options: { payload: { maxBytes: 104857600 } },
      handler: (request, h) => {
        try {
        // var responseString = 'Snaps received successfully.';
          var responseString = '';
          console.log('Received snaps as follows:');
          console.log('\n\n');

          console.log(JSON.stringify(request.headers, null, 2));
          console.log('\n\n');

          // const contentType = request.get('content-type');

          const contentType = request.headers['content-type'];
          mailto = request.headers['configured-mailto'];

          if (mailto === undefined) {
            return h.response('No configured-mailto header on request.').code(400);
          }

          // var payload = JSON.parse(request.body);
          var payload = JSON.parse(request.payload);

          if (payload === undefined) {
            return h.response('No JSON payload on request.').code(400);
          }

          console.log(request.payload);

          console.log('Content type is ' + contentType);
          console.log('Finished receiving posted snaps.');
          console.log('\n\n');

          if (sendEmail) {
            payload.forEach(sendAnEmail);
          }

          var reformattedMailTo = mailto.replace(';', '<br>');

          responseString += 'Snaps being posted to:<br>' + reformattedMailTo;

          // return "hapi isn't great";

          return h.response(responseString);
        } catch (e) {
          return h.response('Unexpected server side error: ' + e).code(500);
        }
      }
    }
  ]);

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
