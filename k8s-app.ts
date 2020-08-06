import * as k8s from '@pulumi/kubernetes';
import { k8sProvider } from './k8s-provider'

const appName = 'my-app';
const appLabels = { app: appName };
const hostname = 'example.com'

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
              image: 'my-image',
            },
          ],
        },
      },
    },
  },
  { provider: k8sProvider },
);

const service = new k8s.core.v1.Service(
  appName,
  {
    metadata: { labels: deployment.spec.template.metadata.labels },
    spec: {
      type: 'NodePort',
      ports: [{ port: 3000, targetPort: 3000, protocol: 'TCP' }],
      selector: appLabels,
    },
  },
  { provider: k8sProvider, parent: deployment },
);

const ingress = new k8s.networking.v1beta1.Ingress(
  appName,
  {
    metadata: {
      labels: appLabels,
      annotations: {
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
        'kubernetes.io/ingress.class': 'nginx',
      },
    },
    spec: {
      tls: [
        {
          hosts: [hostname],
          secretName: `${appName}-tls`,
        },
      ],
      rules: [
        {
          host: hostname,
          http: {
            paths: [
              {
                path: '/',
                backend: {
                  serviceName: service.metadata.name,
                  servicePort: service.spec.ports[0].port,
                },
              },
            ],
          },
        },
      ],
    },
  },
  { provider: k8sProvider, parent: deployment },
);
