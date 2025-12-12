// routes/reviews.js
import express from 'express';
import { submitToHubSpot, sendGoogleReviewEmail } from '../../utils/reveiws/index.js';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const {
            firstname,
            lastname,
            email,
            was_this_your_first_visit_to_waldoch,
            how_would_you_rate_helpfulness_of_our_personnel_,
            how_would_you_rate_our_communication_with_you_,
            quality_of_service_you_received_,
            was_your_vehicle_completed_on_schedule_,
            would_you_recommend_us_to_family_or_friends_,
            what_can_we_do_to_improve_our_service,
            consent_marketing // optional
        } = req.body;

        // === CALCULATE SCORE (same logic as frontend) ===
        let score = 0;
        const maxScore = 20;

        const mapRating = (val) => val === "Excellent" ? 5 : val === "Average" ? 3 : 1;

        score += mapRating(how_would_you_rate_helpfulness_of_our_personnel_);
        score += mapRating(how_would_you_rate_our_communication_with_you_);
        score += mapRating(quality_of_service_you_received_);
        score += would_you_recommend_us_to_family_or_friends_ === "Yes" ? 5 : 1;

        const averageScore = (score / maxScore) * 5; // 5-star scale

        // === SUBMIT TO HUBSPOT ===
        await submitToHubSpot({
            firstname,
            lastname,
            email,
            was_this_your_first_visit_to_waldoch,
            how_would_you_rate_helpfulness_of_our_personnel_,
            how_would_you_rate_our_communication_with_you_,
            quality_of_service_you_received_,
            was_your_vehicle_completed_on_schedule_,
            would_you_recommend_us_to_family_or_friends_,
            what_can_we_do_to_improve_our_service,
            consent_marketing: !!consent_marketing, // checkbox → boolean
            calculated_review_score: averageScore.toFixed(2)
        });

        // === SEND GOOGLE REVIEW EMAIL IF 4+ STARS ===
        if (averageScore >= 4.0) {
            await sendGoogleReviewEmail({
                firstName: firstname,
                lastName: lastname,
                email,
                score: averageScore.toFixed(2)
            });
        }

        res.json({ success: true, score: averageScore.toFixed(2) });
    } catch (error) {
        console.error('Review submission failed:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

export default router;