---
title: "Type 2 Diabetes and Prostate Medications: A Nationwide Korean Study"
slug: "hira-diabetes-study-explained"
date: "2026-01-24"
readingTime: 10
excerpt: "New evidence from South Korea's national health database sheds light on whether finasteride and dutasteride affect diabetes risk. Using robust active-comparator methods, we found minimal to no increased risk."
category: "Pharmacoepidemiology"
tags: ["5-ARIs", "diabetes", "Korea", "finasteride", "dutasteride", "tamsulosin"]
paperTitle: "Risk of type 2 diabetes in new users of 5-alpha reductase inhibitors: A nationwide historical cohort study"
authors: "Minh-Ha Nguyen, Juyeon Ko, Jaelim Cho"
journal: "Yonsei Medical Journal"
paperUrl: "https://www.eymj.org/DOIx.php?id=10.3349/ymj.2025.0056"
doi: "10.3349/ymj.2025.0056"
---

## A Question of Metabolic Safety

5-alpha reductase inhibitors (5-ARIs) — finasteride and dutasteride — are among the most commonly prescribed medications for benign prostatic hyperplasia (BPH). In the UK alone, there are approximately 3.6 million finasteride prescriptions annually. These medications are typically taken for years, even decades.

Given this widespread, long-term use, understanding their full safety profile is critical. One emerging concern has been metabolic effects, particularly the risk of type 2 diabetes (T2DM).

But here's the puzzle: does long-term use of these medications actually increase diabetes risk? Previous research has given conflicting answers - some studies suggested protection, others warned of danger. That kind of disagreement demanded a closer look.

## The Biological Hypothesis

The potential link between 5-ARIs and diabetes isn't arbitrary - it has a biological basis. These medications work by reducing a hormone called dihydrotestosterone (DHT). When DHT levels drop, several things might happen in sequence: fatty tissue may accumulate more easily because of altered cortisol metabolism in adipose tissue. That shift in body fat, in turn, can impair the body's sensitivity to insulin - partly through changes in non-esterified fatty acid levels. On top of that, animal studies suggest 5-ARIs could affect the liver directly, potentially inducing steatotic liver disease and hepatic insulin resistance, which makes the liver less efficient at processing glucose.

Together, these cascading changes - more fat accumulation, reduced insulin sensitivity, impaired liver function - could theoretically push someone toward diabetes. The biological story is plausible, but whether it actually plays out at a clinically meaningful level in real patients is exactly what the epidemiological evidence needs to answer.

## The Conflicting Evidence

Previous studies on this question have produced inconsistent results:

- **Lee et al. (Taiwan)**: Found a **28% decrease** in diabetes risk (HR 0.72) when comparing 5-ARI users to non-users
- **Wei et al. (Taiwan + UK)**: Found a **49% increase** in diabetes risk (HR 1.49) when comparing to tamsulosin users

These results don't just disagree - they go in opposite directions. That kind of contradiction is a red flag in science and suggests something is wrong with how one or both studies was designed. So why such dramatically different results? The key difference lies in the **comparator selection**.

### The Non-User Problem

Comparing 5-ARI users to non-users introduces several biases:

1. **Confounding by indication**: Men receiving treatment have more severe disease and different health-seeking behaviors
2. **Healthy user effect**: Men not on medications may be healthier overall
3. **Detection bias**: Treated patients have more healthcare contact, leading to more diabetes diagnoses

### The Active Comparator Advantage

Tamsulosin is an alpha-blocker used for the same condition (BPH) in a similar patient population. Comparing 5-ARI users to tamsulosin users isolates the drug effect from the disease and healthcare utilization effects.

However, the Wei et al. study had a methodological limitation: it didn't specify a washout period, meaning some "new users" might actually have been prevalent users with prior exposure. If diabetes risk is dose-dependent or cumulative, including prevalent users could inflate the observed risk.

So how did we design our study to avoid these pitfalls?

## Our Study Design

With my colleagues Dr. Juyeon Ko and Dr. Jaelim Cho at Yonsei University, I conducted a new study using South Korea's National Health Insurance Service (NHIS) database — one of the largest and most comprehensive healthcare databases in the world.

### Key Design Features

**1. Strict new-user design**: We required a 3-year lookback period with no prescriptions for 5-ARIs or tamsulosin, ensuring we captured truly new users.

**2. Active comparator**: We compared finasteride and dutasteride users to tamsulosin users — all men with BPH receiving pharmacologic treatment.

**3. 90-day exposure requirement**: Patients needed at least 90 days of medication supply, ensuring we studied sustained use rather than brief trials.

**4. Advanced statistical balancing (inverse probability weighting)**: We used mathematical techniques to adjust for differences between the two groups - age, insurance status, index year, comorbidities, and co-medications - so we were comparing apples to apples. In essence, inverse probability weighting re-weights each patient so that the treatment groups look as similar as possible on all measured characteristics, mimicking what a randomized trial would achieve.

**5. Time-to-event analysis (Cox proportional hazards models)**: We tracked how long it took for diabetes to develop in each group and estimated the relative risk while properly accounting for patients who stopped treatment, switched medications, died, or left the insurance system before the study ended. Cox models are the standard tool for this kind of "time until something happens" question because they handle these incomplete follow-up periods correctly.

## What We Found

Our study included over 71,000 patients:
- 34,874 tamsulosin users
- 16,953 finasteride users  
- 19,480 dutasteride users

### Primary Results

| Medication | Adjusted HR | 95% CI | Interpretation |
|------------|-------------|--------|----------------|
| Finasteride | 1.06 | 1.01–1.11 | Minimal increase |
| Dutasteride | 0.97 | 0.92–1.02 | No difference |

For finasteride, the hazard ratio of 1.06 suggests a **6% increase** in diabetes risk compared to tamsulosin. However, this is a very small effect that barely exceeds the null value, and the clinical significance is questionable.

For dutasteride, the hazard ratio of 0.97 (95% CI 0.92–1.02) indicates **no difference** in diabetes risk compared to tamsulosin.

### Sensitivity Analyses

We conducted several sensitivity analyses to test the robustness of these findings:

**1. Lag-time analyses**: Excluding events in the first 6-12 months to address protopathic bias - the risk that disease symptoms trigger treatment decisions rather than the other way around. For example, a man might visit his doctor for early diabetes symptoms (fatigue, frequent urination) and, during that same visit, also get diagnosed with BPH and started on a 5-ARI. If he's later diagnosed with diabetes, it could look like the medication caused it, when in reality the diabetes was already developing before treatment began. By excluding early events, we tested whether this kind of reverse causation was distorting our results. It wasn't - the findings were consistent.

**2. Good compliance analyses**: Restricting to patients with high medication adherence. The finasteride association attenuated further, suggesting some residual confounding.

**3. Subgroup analyses**: Results were generally consistent across age groups and comorbidity strata.

## What This Means

### Clinical Interpretation

The findings suggest that any effect of finasteride and dutasteride on diabetes risk is **minimal**:

1. **Absolute risk**: A 6% relative increase translates to a very small absolute risk increase given the baseline diabetes incidence in this population.

2. **Comparison to other factors**: Lifestyle factors (diet, exercise, obesity) have much larger effects on diabetes risk than any potential medication effect.

3. **Dutasteride reassurance**: The null finding for dutasteride, which is more potent and has a larger molecular weight (potentially limiting blood-brain barrier penetration), provides reassurance.

### Comparison to Prior Research

Our findings align more closely with the null expectation than the substantial risk increase reported by Wei et al. The key differences in our study:

- **Stricter new-user definition** (3-year washout vs. unspecified)
- **Larger sample size** (71,000 vs. ~40,000)
- **More comprehensive confounding control** through inverse probability weighting

## Strengths and Limitations

### Strengths

1. **National representative data**: The NHIS covers 97% of South Korea's population
2. **Large sample size**: Over 71,000 patients with extensive follow-up
3. **Rigorous design**: New-user, active-comparator design with careful confounding control
4. **Multiple sensitivity analyses**: Results are robust across various assumptions

### Limitations

1. **Observational design**: Despite our best efforts, residual confounding is always possible
2. **Administrative data**: We relied on diagnosis codes and prescription records, not direct clinical assessment
3. **Generalizability**: Results from South Korea may not fully generalize to other populations
4. **Duration**: We studied relatively short-term use; very long-term effects remain uncertain
5. **BPH population**: Results may not apply to men taking 5-ARIs for hair loss (who are typically younger and healthier)

## The Bigger Picture

This study contributes to a growing body of evidence that **5-ARIs have minimal metabolic effects** at the population level:

- Our findings on diabetes are consistent with our parallel work on depression showing minimal psychiatric risk
- The pattern suggests that while biological mechanisms exist, they don't translate into clinically meaningful harms in real-world use
- This reinforces the importance of well-designed observational studies using appropriate comparators

## Recommendations

### For Patients

If you're taking or considering finasteride or dutasteride for BPH:

1. **Don't stop your medication due to diabetes fears** — the evidence doesn't support a substantial risk
2. **Maintain regular diabetes screening** — as recommended for all men over 45, regardless of medication use
3. **Focus on modifiable risk factors** — diet, exercise, and weight management have much larger impacts
4. **Discuss any concerns with your physician** — individualized care is always best

### For Clinicians

When prescribing 5-ARIs:

1. **Prescribe based on efficacy for BPH symptoms** — diabetes risk should not be a major factor
2. **Continue routine diabetes screening** — follow standard guidelines for the patient's age and risk profile
3. **Consider patient anxiety** — some patients may have read about potential risks; this data provides reassurance

### For Researchers

This study illustrates several methodological principles:

1. **Comparator selection matters enormously** — active comparators are essential for treatment studies
2. **Washout periods are crucial** — defining "new users" requires careful consideration of prior exposure
3. **Sensitivity analyses strengthen conclusions** — testing assumptions increases confidence in findings

## Conclusion

Type 2 diabetes is a major global health burden, and understanding medication effects on metabolic risk is important. However, this nationwide cohort study provides strong evidence that **finasteride and dutasteride have minimal to no effect on diabetes risk** in men with BPH.

The 6% relative increase for finasteride is of questionable clinical significance, especially compared to the much larger effects of lifestyle factors. The null finding for dutasteride provides additional reassurance.

For the millions of men taking these medications, this is good news. And for physicians, this evidence supports confident prescribing based on the medications' efficacy for BPH symptoms, without major concerns about metabolic harm.

---

*This post summarizes a study conducted with Dr. Juyeon Ko and Dr. Jaelim Cho at Yonsei University College of Medicine. The full paper is [published in Yonsei Medical Journal](https://www.eymj.org/DOIx.php?id=10.3349/ymj.2025.0056).*
