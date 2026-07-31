City Transition System

Project Documentation and Feature Walkthrough

This document explains each feature of the City Transition System, the technology behind it, and shows the application, pipeline, and monitoring stack actually running.

1. Problem Statement

Moving to a new city is harder than it should be. Most people relocating for work or college run into the same three problems, usually all at once.

First, rental listings on most local platforms are unverified, so it is common to end up dealing with outdated ads or, worse, a listing that turns out to be fake once you actually show up. Second, once you do have a place, figuring out what is actually around you, the nearest working pharmacy, a hospital that takes your insurance, a decent grocery store, takes a lot of trial and error in an area you don't know at all. Third, if the local language is not one you speak, even basic things like asking for directions or negotiating with an auto driver become stressful.

City Transition System was built to take on all three of these at once, inside a single platform: verified listings backed by an admin approval step, a location-based essentials finder, and a language helper that gives you the local language and ready-to-use phrases the moment you tell it where you are.

2. Feature: Accommodation Finder

Allows a newcomer to search available rentals by location and filter criteria.

Frontend: React page, calls backend via Axios
Backend route: GET /api/accommodation
Backend files: accommodation.routes.js, accommodation.controller.js
Database: MongoDB via Mongoose

![Accommodation Finder search results for Mathikere, Bengaluru](docs/screenshots/accommodation.png)

3. Feature: Verified Rental Listings

Property owners submit listings, which go through an admin verification workflow before appearing publicly. This prevents unverified or fraudulent listings from reaching users.

Frontend pages: AddListing, MyListings, VerifyListings (admin)
Backend route: listing.routes.js
Workflow: Owner submits -> pending status -> admin approves/rejects -> visible in public feed

![Verify Listings, admin view showing pending listings ready to Approve](docs/screenshots/verify-listings.png)

4. Feature: Owner Role - Adding Local Accommodation

The platform has three user roles: visitor, owner, and admin. A user registered as an owner can add their own property directly into the accommodation pool, not just the general listings feed. Once an owner-submitted property is approved, it shows up side by side with live results pulled from OpenStreetMap in the same Accommodation Finder search, so a newcomer sees verified local properties and open-data results together in one list instead of two separate sources.

Role-gated routes: listing.routes.js restricts add/edit/delete actions to the owner role
Data model: User.js defines role as visitor, owner, or admin
Merge logic: accommodation.controller.js normalizes owner listings and OpenStreetMap results into one combined result set, tagged by source

![Add Rental Listing form, owner submitting a new property](docs/screenshots/add-listing.png)

![My Listings, owner view showing a submitted listing with Pending status](docs/screenshots/my-listings.png)

5. Feature: Nearby Essentials Finder

Given a location, radius, and category, returns nearby hospitals, pharmacies, grocery stores, and similar essentials on demand.

Frontend page: NearbyEssentials.jsx, route /nearby-essentials
Backend route: GET /api/nearby?lat=&lng=&type=&radius=
Backend files: nearby.routes.js, nearby.controller.js, nearby.service.js
External API: OpenStreetMap Overpass API

![Nearby Essentials Finder, hospitals near Mathikere](docs/screenshots/nearby.png)

6. Feature: Local Language Helper

A newcomer enters a place name; the backend geocodes it, maps the detected state to its primary local language, and returns curated survival phrases (emergency, transport, shopping, basic conversation). A free-text sentence is checked against the curated phrasebook first, and falls back to a translation API only if no exact match exists. No AI/LLM is used for location or language detection, by design, to keep results deterministic and explainable.

Frontend page: LocalLanguageHelper.jsx, route /local-language-helper
Backend routes: GET /api/language-helper, POST /api/language-helper/translate
Backend files: languageHelper.controller.js, languageHelper.service.js, languageHelper.data.js
External APIs: OpenStreetMap Nominatim (geocoding), MyMemory translation API (configurable via TRANSLATION_API_URL)

![Local Language Helper, Bengaluru detected as Kannada, live sentence translation](docs/screenshots/language.png)

7. Containerization, Orchestration and Pipeline Integration

Everything the app runs on, backend, frontend, and the way it gets deployed, is built around Docker and Kubernetes, wired together by a Jenkins pipeline. Here is how the pieces actually connect.

A Docker image is a packaged, frozen copy of the application: the code, its dependencies, and everything it needs to run, bundled into one file. A container is what you get when that image is actually started up and running. The backend and frontend each have their own Dockerfile, which defines exactly how their image gets built.

The connection to Jenkins works like this: every time code is pushed to GitHub, the Jenkins pipeline picks it up, runs it through linting and tests, then runs docker build to turn the fresh source code into a new image, and pushes that image to Docker Hub. From there, Jenkins tells Kubernetes to pull the new image and restart the deployment, so the old containers are replaced with new ones running the latest code. This is why the running application never depends on any file sitting on a local machine, the moment an image is built, it is a fully self-contained package.

Kubernetes is the layer that actually keeps the containers alive day to day. It watches the backend and frontend deployments, restarts a container automatically if it crashes, and exposes each service on a fixed port (frontend on 30007, backend on 30008) so the app is reachable the same way every time, regardless of which underlying container is currently serving it.

![Docker Desktop, backend and frontend images built by the pipeline](docs/screenshots/docker_images.png)

![Docker Desktop, backend, frontend, and monitoring stack containers running under Kubernetes](docs/screenshots/docker_containers.png)

8. Monitoring: Prometheus and Grafana

Once the app is deployed, Prometheus and Grafana are what keep an eye on it while it runs.

Prometheus's job is to collect data. Every few seconds, it pings the backend's /metrics endpoint and pulls in numbers like how many requests each API route is getting, how fast those requests are being answered, and how many of them are failing. It also collects lower-level numbers through two helper tools, cAdvisor, which reports how much CPU and memory each container is using, and Node Exporter, which reports the same for the machine itself. All of this gets stored as a running history of numbers over time.

Grafana's job is to take that raw data from Prometheus and turn it into readable dashboards, graphs, and live numbers instead of a wall of metrics. This is where you can actually see, in real time, things like the response time for the login route, how many requests the nearby-essentials search is getting, or whether error rates are spiking anywhere. A third tool, Blackbox Exporter, continuously hits the live app's URLs from outside, just to confirm the site itself is actually reachable, not just that the containers are technically running.

![Grafana, live Health and Auth API response time and throughput panels](docs/screenshots/grafana.png)
