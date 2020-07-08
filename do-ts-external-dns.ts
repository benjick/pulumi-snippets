import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { provider } from './cluster';

// pulumi config set digitalocean:token TOKEN_HERE --secret
const config = new pulumi.Config('digitalocean');
const apiToken = config.requireSecret('token');

export const externalDnsChart = new k8s.helm.v2.Chart(
  'external-dns',
  {
    chart: 'external-dns',
    version: '3.2.3',
    values: {
      digitalocean: {
        apiToken,
      },
      provider: 'digitalocean',
      txtOwnerId: 'do-external-dns-pulumi',
      podSecurityContext: {
        fsGroup: 65534,
      },
    },
    fetchOpts: {
      repo: 'https://charts.bitnami.com/bitnami',
    },
  },
  {
    provider,
  },
);
