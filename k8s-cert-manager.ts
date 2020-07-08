import * as k8s from '@pulumi/kubernetes';
import { provider } from './cluster';

export const nginxIngressNamespace = new k8s.core.v1.Namespace(
  'nginx-ingress',
  undefined,
  { provider: provider },
);

export const nginxChart = new k8s.helm.v2.Chart(
  'nginx',
  {
    namespace: nginxIngressNamespace.metadata.name,
    chart: 'nginx-ingress',
    version: '1.40.2',
    fetchOpts: { repo: 'https://kubernetes-charts.storage.googleapis.com/' },
    values: {
      controller: {
        publishService: {
          enabled: true,
        },
      },
    },
  },
  {
    provider: provider,
  },
);
