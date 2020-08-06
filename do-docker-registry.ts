import * as digitalocean from '@pulumi/digitalocean';
import * as docker from '@pulumi/docker';
import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { k8sProvider } from './k8s-provider';

// Step 1: Create a registry - you can only have one
export const registry = new digitalocean.ContainerRegistry('my-registry');

// Step 2: Create registry credentials
const credentials = new digitalocean.ContainerRegistryDockerCredentials(
  'my-registry-credentials',
  {
    registryName: registry.name,
    write: true,
    expirySeconds: 60 * 60 * 30, // 30 days
  },
);

// Step 3: Extract credentials from the created resource
const registryCredentials = credentials.dockerCredentials.apply(
  (credentials) => {
    const json = JSON.parse(credentials);
    const base64 = json.auths['registry.digitalocean.com'].auth;
    const [username, password] = Buffer.from(base64, 'base64').toString(
      'binary',
    );
    return {
      username,
      password,
      server: 'registry.digitalocean.com',
    };
  },
);

// Step 4: Create credentials for pull secret.
// You can probably use `credentials.dockerCredentials` for this.
const base64Credentials = registryCredentials.apply(
  ({ username, password }) => {
    const base64Credentials = Buffer.from(`${username}:${password}`).toString(
      'base64',
    );
    const json = `{"auths":{"registry.digitalocean.com":{"auth":"${base64Credentials}"}}}`;
    return Buffer.from(json).toString('base64');
  },
);

// Step 5: Create the secret
export const pullSecret = new k8s.core.v1.Secret(
  'my-registry-pull-secret',
  {
    type: 'kubernetes.io/dockerconfigjson',
    data: {
      '.dockerconfigjson': base64Credentials,
    },
  },
  { provider: k8sProvider },
);

// To be used as a shortcut later
export const imagePullSecrets = [
  {
    name: pullSecret.metadata.name,
  },
];

// Step 6: Build and push an image to the registry
export const image = new docker.Image('my-app', {
  build: '../webapp',
  imageName: pulumi.interpolate`registry.digitalocean.com/${registry.name}/my-app`,
  registry: registryCredentials,
});

// Step 7: Deploy your image
const appLabels = { app: 'my-app' };

const deployment = new k8s.apps.v1.Deployment(
  'my-app',
  {
    metadata: { labels: appLabels },
    spec: {
      selector: { matchLabels: appLabels },
      replicas: 1,
      template: {
        metadata: { labels: appLabels },
        spec: {
          imagePullSecrets,
          containers: [
            {
              name: appLabels.app,
              image: image.imageName,
            },
          ],
        },
      },
    },
  },
  { provider: k8sProvider },
);
