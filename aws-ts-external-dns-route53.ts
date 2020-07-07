import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as aws from '@pulumi/aws';
import * as random from '@pulumi/random';
import { cluster } from './cluster';

/*
 * Sets up external DNS on Route 53. Includes:
 * * IAM role
 * * IAM policy
 * * External DNS Helm chart
 *
 * This can probably be simplified a lot
 */

const current = pulumi.output(aws.getCallerIdentity({ async: true }));

const oidcProvider = cluster.core.oidcProvider!;

const randomId = new random.RandomId('update-route53', {
  byteLength: 8,
});

const name = pulumi.interpolate`update-route53-${randomId.hex}`;

const updateRoute53Role = new aws.iam.Role(
  'update-route53',
  {
    name,
    assumeRolePolicy: pulumi.interpolate`{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "${oidcProvider.id}"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "${oidcProvider.url}:sub": "system:serviceaccount:default:${name}",
            "${oidcProvider.url}:aud": "sts.amazonaws.com"
          }
        }
      }
    ]
  }
  `,
  },
  {
    dependsOn: cluster,
  },
);

const policy = new aws.iam.Policy('AllowExternalDNSUpdates', {
  description: 'This policy allows external-dns to update route53',
  path: '/',
  policy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['route53:ChangeResourceRecordSets'],
        Resource: ['arn:aws:route53:::hostedzone/*'],
      },
      {
        Effect: 'Allow',
        Action: ['route53:ListHostedZones', 'route53:ListResourceRecordSets'],
        Resource: ['*'],
      },
    ],
  }),
});

const rolePolicyAttachment = new aws.iam.RolePolicyAttachment(
  'update-route53',
  {
    role: updateRoute53Role,
    policyArn: policy.arn,
  },
);

const policyAttachment = new aws.iam.PolicyAttachment('update-route53', {
  roles: [updateRoute53Role],
  policyArn: policy.arn,
});

const externalDnsChart = new k8s.helm.v2.Chart(
  'external-dns',
  {
    chart: 'external-dns',
    version: '3.2.3',
    values: {
      // @Doc: https://github.com/bitnami/charts/tree/master/bitnami/external-dns/#parameters
      txtOwnerId: 'dns-pulumi',
      domainFilters: ['example.com'],
      aws: {
        zoneType: 'public',
      },
      podSecurityContext: {
        fsGroup: 65534,
      },
      serviceAccount: {
        name: updateRoute53Role.name,
        annotations: {
          'eks.amazonaws.com/role-arn': updateRoute53Role.arn,
        },
      },
    },
    fetchOpts: {
      repo: 'https://charts.bitnami.com/bitnami',
    },
  },
  {
    dependsOn: [cluster, updateRoute53Role],
    provider: cluster.provider,
  },
);

// Example usage

const config = new pulumi.Config();
const appName = config.get('name') || 'exampleApp';
const domain = config.get('domain') || 'app.example.com';

// Ingress example

const ingress = new k8s.networking.v1beta1.Ingress(
  appName,
  {
    metadata: {
      labels: { app: appName },
      annotations: {
        'kubernetes.io/ingress.class': 'nginx',
      },
    },
    spec: {
      rules: [
        {
          host: domain,
          http: {
            paths: [
              {
                path: '/',
                backend: {
                  serviceName: appName,
                  servicePort: 'http',
                },
              },
            ],
          },
        },
      ],
    },
  },
  { provider: cluster.provider },
);

// Create zone in route53

// Look up main zone
const main = pulumi.output(
  aws.route53.getZone(
    {
      name: 'example.',
    },
    { async: true },
  ),
);

// Create zone for app.example.com
const dev = new aws.route53.Zone('zone', {
  name: domain,
});

// Add the nameservers of app.example.com to example.com
const devNs = new aws.route53.Record('zone-ns', {
  name: domain,
  records: [
    dev.nameServers[0],
    dev.nameServers[1],
    dev.nameServers[2],
    dev.nameServers[3],
  ],
  ttl: 30,
  type: 'NS',
  zoneId: main.zoneId,
});
