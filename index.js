const Mailgun = require('mailgun-js');
const humanizeDuration = require('humanize-duration');
const config = require('./config.json');

module.exports.mailgun = new Mailgun({
  apiKey: config.MAILGUN_API_KEY,
  domain: config.MAILGUN_DOMAIN,
});

// subscribe is the main function called by Cloud Functions.
module.exports.subscribe = (data, context, callback) => {
  const build = module.exports.eventToBuild(data.data);

  // Skip if the current status is not in the status list.
  const status = ['SUCCESS', 'FAILURE', 'INTERNAL_ERROR', 'TIMEOUT'];
  if (status.indexOf(build.status) === -1) {
    return callback();
  }

  module.exports.rollingUpdateAndCreateEmail(build)
  .then(message => {
    module.exports.mailgun.messages().send(message, callback);
  })
  .catch(error => {
    callback();
  })
};

// eventToBuild transforms pubsub event message to a build object.
module.exports.eventToBuild = (data) => {
  const buf =  Buffer.from(data, 'base64');
  return JSON.parse(buf.toString());
}

// rollingUpdateAndCreateEmail rolling update to k8s and 
// create an email message from a build object.
module.exports.rollingUpdateAndCreateEmail = async (build) => {
  let duration = humanizeDuration(new Date(build.finishTime) - new Date(build.startTime));
  let content = `Build ${build.id} finished with status ${build.status}, in ${duration}. \n ${build.logUrl} `;
  let subject = `CloudBuild ${build.id} finished`;
  if (build.images) {
    let images = build.images.join(',');
    let tagname = images.split(":")[1];
    let buildobj = JSON.stringify(build);
    content = `Images: ${images}\n${content}`;
    subject = `CloudBuild ${tagname} ${build.status}`;

    if (build.status === 'SUCCESS') {
      // rolling update to k8s
      const K8sConfig = require('kubernetes-client').config;
      const Client = require('kubernetes-client').Client
      const path = config.KUBE_CONFIG;
      try {
        const client = new Client({ config: K8sConfig.fromKubeconfig(path), version: '1.9' });
        const deployment = await client.apis.apps.v1.namespaces(config.KUBE_NAMESPACE)
          .deployments(config.KUBE_APPLABEL).get();
        console.log('Deployment: ', deployment);
        //
        // Modify the image tag
        //
        const newImage = {
          spec: {
            template: {
              spec: {
                containers: [{
                  name: config.KUBE_IMAGE_NAME,
                  image: `${config.KUBE_IMAGE}:${tagname}`
                }]
              }
            }
          }
        };
        const imageSet = await client.apis.apps.v1.namespaces(config.KUBE_NAMESPACE)
          .deployments(config.KUBE_APPLABEL).patch({ body: newImage });
        console.log('New Image: ', imageSet);
        content = `${content}\n\nRolling update to k8s: SUCCESSED`
      } catch (err) {
        content = `${content}\n\nError when rolling update to k8s: ${err}`
      }    
    }
  }
  let message = {
    from: config.MAILGUN_FROM,
    to: config.MAILGUN_TO,
    subject: subject,
    text: content
  };
  return message
}
