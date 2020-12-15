// https://sendgrid.com/docs/ui/account-and-settings/custom-ssl-configurations/

import * as k8s from '@pulumi/kubernetes';
import { namespace } from './namespace';
import { k8sProvider } from './provider';

const host = 'url1234.example.com'

const sendgrid = new k8s.core.v1.Service(
  'sendgrid',
  {
    metadata: {
      namespace: namespace.metadata.name,
    },
    spec: {
      type: 'ExternalName',
      externalName: 'sendgrid.net',
    },
  },
  { provider: k8sProvider },
);

new k8s.networking.v1beta1.Ingress(
  'sendgrid-link-branding',
  {
    metadata: {
      namespace: namespace.metadata.name,
      annotations: {
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
        'kubernetes.io/ingress.class': 'nginx',
        'nginx.ingress.kubernetes.io/temporal-redirect': '',
        'nginx.ingress.kubernetes.io/backend-protocol': 'HTTPS',
        'nginx.ingress.kubernetes.io/ssl-passthrough': 'true',
      },
    },
    spec: {
      tls: [
        {
          hosts: [host],
          secretName: 'sendgrid-link-branding-tls',
        },
      ],
      rules: [
        {
          host,
          http: {
            paths: [
              {
                backend: {
                  serviceName: sendgrid.metadata.name,
                  servicePort: 443,
                },
              },
            ],
          },
        },
      ],
    },
  },
  { provider: k8sProvider },
);
