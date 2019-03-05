# gcb-to-k8s

When your Cloud Build builds change states, it can trigger events about these changes 
and initiating a rolling update to kubernetes.

## Continuous Deployment Practices

1. Setup Google Cloud Build
- stage: build new container image, and use short_commit_sha1 as container image's tag name. 
- production: build new container image, and use git tag_name as container image's tag name. 

2. Config and deploy this cloud function to initating rolling update to stage/prod kubernetes cluster accordingly.

## Costs

This practice uses billable components of Google Cloud Platform, including:

- Cloud Build
- Cloud Functions
- Cloud Pub/Sub

## Before you begin

1. Select or create a Google Cloud Platform project.
2. Make sure that billing is enabled for your Google Cloud Platform project.
3. Enable the Cloud Functions, Cloud Pub/Sub, and Kubernetes Engine APIs.
4. Install and initialize the Cloud SDK.
5. Update and install gcloud components:
```
gcloud components update &&
gcloud components install alpha beta
```

## Creating the Cloud Function

Create a Cloud Storage bucket to stage your Cloud Functions files, where [STAGING_BUCKET_NAME] is a globally-unique bucket name (such as [PROJECT-ID]_cloudbuilds):
```
gsutil mb gs://[STAGING_BUCKET_NAME]
```

You should see the following output:
```
Creating gs://[PROJECT-ID]_cloudbuilds/[STAGING_BUCKET_NAME]...
```

## Email notifications

The following sections walk you through setting up email notifications using the Mailgun API.

If you are new to Mailgun, follow [their quickstart documentation](https://documentation.mailgun.com/en/latest/quickstart.html).

Prepare Mailgun settings
1. If you haven't already, create a Mailgun account.
2. Add a new domain, then follow Mailgun's instructions for verifying your domain. This may take up to 48 hours.
3. From the domains page, click your domain to open its settings page.
4. From your domain's settings page, copy the domain's API key and save it for later use.

You must also have the following:

- An email address for sending email. This email address can belong to the domain you provide. If you are not sure which email address to use, check with your domain provider. You can also provide an nonexistent email if you do not expect a response from the recipient, such as noreply@mydomain.com.
- An email address for receiving email. The recipient can be any email address.

## Rolling update k8s deployment

Put `kube-config.yaml` within this repo's directory.


## Creating configuration

Then, create the config file in this repo's directory:
```
{
    "MAILGUN_API_KEY":"[API_KEY]",
    "MAILGUN_DOMAIN":"email.com",
    "MAILGUN_FROM":"me@email.com",
    "MAILGUN_TO":"someone@email.com",
    "KUBE_CONFIG": "./kube-config.yaml",
    "KUBE_NAMESPACE": "default",
    "KUBE_APPLABEL": "your-k8s-app",
    "KUBE_IMAGE_NAME": "you-k8s-app",
    "KUBE_IMAGE": "gcr.io/[PROJECT-ID]/[STAGING_IMAGE_NAME]"
}
```
In this file, you must provide the following information:
- MAILGUN_API_KEY, the API key you collected
- MAILGUN_DOMAIN, the domain you added
- MAILGUN_FROM, the email address belonging to the domain from which email is sent (even one that doesn't exist)
- MAILGUN_TO, the email address to which email is sent
- KUBE_CONFIG, the kubernetes [config yaml](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/) file
- KUBE_NAMESPACE, ths kubernetes namespace
- KUBE_APPLABEL, the lable or name of the kubernetes deployment
- KUBE_IMAGE_NAME, the container image name in the kubernetes deployment
- KUBE_IMAGE, the container image, without tag, in the kubernetes deployment

### Deploying the Cloud Function

To deploy the function, run the following command in the gcb_email directory:
```
gcloud functions deploy subscribe --stage-bucket [STAGING_BUCKET_NAME] --trigger-topic cloud-builds --runtime nodejs8
```

where [STAGING_BUCKET_NAME] is the name of your staging Cloud Storage Bucket, such as [PROJECT-ID]_cloudbuilds.

After you've completed deployment of the Cloud Function, you should receive an email notification and 
a k8s rolling update is performed when a build event occurs.



Based on the article of https://cloud.google.com/cloud-build/docs/configure-third-party-notifications

