/** The simulated interview cannot be enabled on a production deployment. */
export function isInterviewPreviewEnabled(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';
}
