import * as k8s from '@pulumi/kubernetes';
import { provider } from './provider';
import { image } from './docker-image';

const appName = 'cool-app';
const appLabels = { app: appName };

const deployment = new k8s.apps.v1.Deployment(
  appName,
  {
    spec: {
      selector: { matchLabels: appLabels },
      replicas: 1,
      template: {
        metadata: { labels: appLabels },
        spec: {
          containers: [
            {
              name: appName,
              image: image.id,
            },
          ],
        },
      },
    },
  },
  { provider },
);

const service = new k8s.core.v1.Service(
  appName,
  {
    metadata: { labels: deployment.spec.template.metadata.labels },
    spec: {
      type: 'LoadBalancer',
      ports: [{ port: 3000, targetPort: 3000, protocol: 'TCP' }],
      selector: appLabels,
    },
  },
  { provider },
);
