import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  Tags,
  type StackProps,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_iam as iam,
  aws_s3 as s3,
} from "aws-cdk-lib";
import type { Construct } from "constructs";

export class FinanceSiteStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    Tags.of(this).add("Project", "finance-overview");
    Tags.of(this).add("ManagedBy", "aws-cdk");

    const bucket = new s3.Bucket(this, "Site", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: Duration.days(30),
          abortIncompleteMultipartUploadAfter: Duration.days(1),
        },
      ],
    });
    const headers = new cloudfront.ResponseHeadersPolicy(this, "Headers", {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy:
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy:
            cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          override: true,
        },
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
            override: true,
          },
        ],
      },
    });
    // Minimum zero respects the entry page's no-cache metadata. Content-hashed
    // assets have a separate long-lived behavior and are retained across releases.
    const cache = new cloudfront.CachePolicy(this, "EntryCache", {
      minTtl: Duration.seconds(0),
      defaultTtl: Duration.seconds(60),
      maxTtl: Duration.days(365),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });
    const origin = origins.S3BucketOrigin.withOriginAccessControl(bucket);
    const behavior = {
      origin,
      responseHeadersPolicy: headers,
      compress: true,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
    };
    const distribution = new cloudfront.Distribution(this, "Cdn", {
      comment: "Finance overview learning deployment",
      defaultRootObject: "index.html",
      defaultBehavior: { ...behavior, cachePolicy: cache },
      additionalBehaviors: {
        "assets/*": {
          ...behavior,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableIpv6: true,
    });
    const github = new iam.CfnOIDCProvider(this, "GitHubOidc", {
      url: "https://token.actions.githubusercontent.com",
      clientIdList: ["sts.amazonaws.com"],
    });
    const deployRole = new iam.Role(this, "GitHubDeploy", {
      description:
        "Publish finance static releases from Isaac-ek/finance-dashboard-ui main only",
      assumedBy: new iam.WebIdentityPrincipal(github.attrArn, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub":
            "repo:Isaac-ek/finance-dashboard-ui:ref:refs/heads/main",
        },
      }),
      maxSessionDuration: Duration.hours(1),
    });
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [
          bucket.arnForObjects("index.html"),
          bucket.arnForObjects("assets/*"),
          bucket.arnForObjects("releases/*"),
        ],
      }),
    );
    // S3 requires ListBucket to distinguish a missing key (404) from access denied.
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket"],
        resources: [bucket.bucketArn],
      }),
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
        ],
        resources: [
          `arn:${this.partition}:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
        ],
      }),
    );
    // Account-plan metadata has no resource-level IAM scope. Read-only, used by
    // the free-only guard before any release writes.
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["freetier:GetAccountPlanState"],
        resources: ["*"],
      }),
    );
    new CfnOutput(this, "SiteBucket", { value: bucket.bucketName });
    new CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });
    new CfnOutput(this, "SiteUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });
    new CfnOutput(this, "DeployRoleArn", { value: deployRole.roleArn });
    new CfnOutput(this, "Region", { value: this.region });
  }
}
