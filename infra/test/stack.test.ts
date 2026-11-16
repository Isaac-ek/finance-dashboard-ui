import { test } from "node:test";
import assert from "node:assert/strict";
import { App, BootstraplessSynthesizer } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { FinanceSiteStack } from "../stack.js";

function template() {
  return Template.fromStack(
    new FinanceSiteStack(new App(), "Test", {
      env: { account: "111111111111", region: "us-east-1" },
      synthesizer: new BootstraplessSynthesizer(),
    }),
  );
}
test("origin stays private, encrypted and versioned; deletion retains release data", () => {
  const t = template();
  t.hasResource("AWS::S3::Bucket", {
    DeletionPolicy: "Retain",
    Properties: {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: Match.objectLike({
        ServerSideEncryptionConfiguration: [
          { ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } },
        ],
      }),
      VersioningConfiguration: { Status: "Enabled" },
    },
  });
  t.hasResourceProperties("AWS::CloudFront::OriginAccessControl", {
    OriginAccessControlConfig: Match.objectLike({
      SigningBehavior: "always",
      SigningProtocol: "sigv4",
    }),
  });
  t.hasResourceProperties("AWS::S3::BucketPolicy", {
    PolicyDocument: {
      Statement: Match.arrayWith([
        Match.objectLike({
          Principal: { Service: "cloudfront.amazonaws.com" },
          Condition: { StringEquals: { "AWS:SourceArn": Match.anyValue() } },
        }),
      ]),
      Version: "2012-10-17",
    },
  });
});
test("only this repository's main branch can assume the release role", () => {
  template().hasResourceProperties("AWS::IAM::Role", {
    AssumeRolePolicyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "sts:AssumeRoleWithWebIdentity",
          Principal: Match.anyValue(),
          Condition: {
            StringEquals: {
              "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
              "token.actions.githubusercontent.com:sub":
                "repo:Isaac-ek/finance-dashboard-ui:ref:refs/heads/main",
            },
          },
        },
      ],
    },
  });
});
test("release role cannot delete data, edit infrastructure, or access other buckets", () => {
  const policies = template().findResources("AWS::IAM::Policy");
  const statements = Object.values(policies).flatMap(
    (p: any) => p.Properties.PolicyDocument.Statement,
  );
  assert.deepEqual(
    statements.flatMap((s: any) => s.Action).sort(),
    [
      "freetier:GetAccountPlanState",
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket",
    ].sort(),
  );
  assert.ok(
    statements
      .filter(
        (s: any) =>
          !([s.Action].flat() as string[]).includes(
            "freetier:GetAccountPlanState",
          ),
      )
      .every((s: any) => !JSON.stringify(s.Resource).includes('"*"')),
  );
});
test("HTTPS and headers are enforced; entry cache honors revalidation", () => {
  const t = template();
  t.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: Match.objectLike({
      DefaultRootObject: "index.html",
      PriceClass: "PriceClass_100",
      DefaultCacheBehavior: Match.objectLike({
        ViewerProtocolPolicy: "redirect-to-https",
        AllowedMethods: ["GET", "HEAD"],
      }),
    }),
  });
  t.hasResourceProperties("AWS::CloudFront::CachePolicy", {
    CachePolicyConfig: Match.objectLike({ MinTTL: 0 }),
  });
  t.hasResourceProperties("AWS::CloudFront::ResponseHeadersPolicy", {
    ResponseHeadersPolicyConfig: Match.objectLike({
      SecurityHeadersConfig: Match.objectLike({
        ContentTypeOptions: { Override: true },
        FrameOptions: { FrameOption: "DENY", Override: true },
        ContentSecurityPolicy: Match.objectLike({ Override: true }),
      }),
    }),
  });
  t.resourceCountIs("AWS::Lambda::Function", 0);
});
