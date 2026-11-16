import { App, BootstraplessSynthesizer } from "aws-cdk-lib";
import { FinanceSiteStack } from "./stack.js";

const account = process.env.AWS_ACCOUNT_ID;
const region = process.env.AWS_REGION || "us-east-1";
if (!account || !/^\d{12}$/.test(account)) {
  throw new Error(
    "Set AWS_ACCOUNT_ID to your 12-digit account ID before synthesizing.",
  );
}
const app = new App();
new FinanceSiteStack(app, "FinanceOverviewAws", {
  env: { account, region },
  // No Lambda/assets are packaged in this stack. The release pipeline uploads
  // static files separately, so CDK bootstrap resources are unnecessary.
  synthesizer: new BootstraplessSynthesizer(),
});
app.synth();
