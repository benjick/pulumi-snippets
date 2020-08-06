import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
import { k8sProvider } from './k8s-provider';
import { ClusterIssuer } from './clusterIssuer'; // from https://github.com/brpaz/pulumi-k8s-resources

const config = new pulumi.Config();
const email = config.requireSecret('letsEncryptEmail');

export const certManagerNamespace = new k8s.core.v1.Namespace(
  'cert-manager',
  undefined,
  { provider: provider },
);

export const certManagerChart = new k8s.helm.v2.Chart(
  'cert-manager',
  {
    chart: 'cert-manager',
    version: 'v0.15.1',
    namespace: certManagerNamespace.metadata.name,
    values: {
      installCRDs: true,
    },
    fetchOpts: {
      repo: 'https://charts.jetstack.io',
    },
  },
  {
    parent: certManagerNamespace,
    provider: k8sProvider,
  },
);

const solvers = [
  {
    http01: {
      ingress: {
        class: 'nginx',
      },
    },
  },
];

const letsencryptStaging = new ClusterIssuer(
  'letsencrypt-staging',
  {
    name: 'letsencrypt-staging',
    namespace: certManagerNamespace.metadata.name,
    acme: {
      server: 'https://acme-staging-v02.api.letsencrypt.org/directory',
      privateKeySecretRef: {
        name: 'letsencrypt-staging',
      },
      email,
      solvers,
    },
  },
  {
    provider: k8sProvider,
    parent: certManagerNamespace,
  },
);

const letsencryptProduction = new ClusterIssuer(
  'letsencrypt-prod',
  {
    name: 'letsencrypt-prod',
    namespace: certManagerNamespace.metadata.name,
    acme: {
      server: 'https://acme-v02.api.letsencrypt.org/directory',
      privateKeySecretRef: {
        name: 'letsencrypt-prod',
      },
      email,
      solvers,
    },
  },
  {
    provider: k8sProvider,
    parent: certManagerNamespace,
  },
);
