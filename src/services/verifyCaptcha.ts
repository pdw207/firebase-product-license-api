const Sentry = require("@sentry/serverless");

const verifyCaptcha = async (req: any, res: any, next: () => any) => {
  try {
    const {"g-recaptcha-response": token} = req.body;
    const response = await require("axios").post(
      "https://www.google.com/recaptcha/api/siteverify",
      {},
      {
        params: {
          secret: process.env.CAPTCHA_SECRET_KEY,
          response: token,
        },
      },
    );

    if (response.data.success) {
      next();
    } else {
      res.status(401).json({error: "Captcha verification failed"});
    }
  } catch (error) {
    Sentry.captureException(error);
    return res.status(500).json({error: "Server error"});
  }
};
export default verifyCaptcha;
