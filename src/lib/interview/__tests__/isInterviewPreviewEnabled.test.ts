import {isInterviewPreviewEnabled} from '../isInterviewPreviewEnabled';
const original={...process.env};
afterEach(()=>{process.env={...original};});
it.each([
 ['development',undefined,true],
 ['production','preview',true],
 ['production','production',false],
 ['production',undefined,false],
])('limits simulated interviews to review environments (%s/%s)',(nodeEnv,vercelEnv,enabled)=>{
 Object.assign(process.env,{NODE_ENV:nodeEnv});
 if(vercelEnv)process.env.VERCEL_ENV=vercelEnv;else delete process.env.VERCEL_ENV;
 expect(isInterviewPreviewEnabled()).toBe(enabled);
});
