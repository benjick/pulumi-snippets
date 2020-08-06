import * as awsx from '@pulumi/awsx';
import { DockerBuild } from '@pulumi/docker';

const buildOptions: DockerBuild = {
  dockerfile: 'app/Dockerfile.production',
  context: 'app',
};

export const repository = new awsx.ecr.Repository('myRepo', {
  lifeCyclePolicyArgs: {
    rules: [
      {
        description: 'Expire images older than 14 days',
        maximumAgeLimit: 14,
        maximumNumberOfImages: 10,
        selection: 'any',
      },
    ],
  },
});

export const image = repository.buildAndPushImage(buildOptions);
