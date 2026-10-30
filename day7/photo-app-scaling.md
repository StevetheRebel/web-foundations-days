# SnapShare scaling plan

## 1. Assumptions and daily active users

SnapShare is a photo-sharing app. Users upload photos and scroll through photos from people they follow.

We will use these assumptions:

- SnapShare has 10 million registered users.
- 10% use the app each day.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- Each original photo averages 2 MB.
- Each photo gets one 50 KB thumbnail, a smaller version used in the feed.
- Peak traffic reaches 5 times average traffic.
- A year has 365 days.
- User activity stays constant throughout the year.
- Photos remain stored without deletion.
- We use decimal units: 1 MB = 1,000 KB and 1 TB = 1,000,000 MB.

Daily active users:

10,000,000 × 10% = **1,000,000 daily active users**

## 2. Traffic and storage calculations

There are 24 × 60 × 60 = **86,400 seconds per day**.

### Photo uploads

Each active user uploads one photo per day.

Daily uploads:

1,000,000 × 1 = **1,000,000 uploads**

Average uploads per second:

1,000,000 ÷ 86,400 = **11.57**, or about **12**

Peak uploads per second:

11.57 × 5 = **57.87**, or about **58**

### Feed page views

Each active user views 50 feed pages per day.

Daily feed views:

1,000,000 × 50 = **50,000,000 feed views**

Average feed views per second:

50,000,000 ÷ 86,400 = **578.70**, or about **579**

Peak feed views per second:

578.70 × 5 = **2,893.52**, or about **2,894**

These figures count feed page requests. Each page also triggers separate requests to download its images.

### Photo storage per year

Each upload adds:

2 MB original + 0.05 MB thumbnail = **2.05 MB**

Daily storage:

1,000,000 × 2.05 MB = **2.05 TB**

Annual storage:

2.05 TB × 365 = **748.25 TB**

| Image type      | Storage per year |
| --------------- | ---------------- |
| Original photos | 730 TB           |
| Thumbnails      | 18.25 TB         |
| Total           | 748.25 TB        |

This is new image storage added each year. It excludes database records, backups, and extra copies.

We do not multiply annual storage by five. The peak multiplier describes busy periods within the same daily activity.

## 3. Is SnapShare read-heavy or write-heavy?

SnapShare is **read-heavy**.

Each active user views 50 feed pages for every photo uploaded. The app receives far more requests to read content than to create content.

The design should make reading fast:

- A cache holds frequently requested feed information.
- A read replica handles database reads.
- A CDN delivers photos close to users.
- Multiple app servers handle requests together.

Uploads still require enough network bandwidth because photo files are much larger than text records.

## 4. Where should photos be stored?

Store photos and thumbnails in **object storage**, a service built to hold files.

Store information about each photo in the database:

- Photo ID.
- Owner ID.
- Caption.
- Upload time.
- Original file location.
- Thumbnail file location.
- Processing status.

Putting large photo files inside the database increases its size and makes backups and replication more expensive.

Keeping files in object storage lets the database focus on finding and updating information.

## 5. Architecture diagram
```
FEED AND API REQUESTS

[User's app]
      |
      v
[Load balancer]
      |
      v
[App servers] ---------> [Cache]
      |
      +--- writes -----> [Primary database]
      |                         |
      |                    replication
      |                         |
      +--- reads ------> [Read replica]


PHOTO UPLOADS AND DOWNLOADS

[User's app] -- direct upload --> [Object storage]
     |
     +-- image request --> [CDN]
                             |
                        cache miss
                             |
                             v
                       [Object storage]


THUMBNAIL PROCESSING

[Object storage]
      |
  upload event
      |
      v
   [Queue]
      |
      v
   [Worker] -- saves thumbnail --> [Object storage]
      |
      +-- updates photo status -> [Primary database]
```

The app server gives the user’s app a temporary upload URL before the direct upload.

For feed requests, the app server checks the cache first. If the information is missing, it reads from the database.

## 6. What each component does

| Component        | Problem it solves                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Load balancer    | Shares incoming API requests across healthy app servers so one server does not handle every request. |
| App servers      | Run the app’s logic, including checking users, preparing feeds, and coordinating uploads.            |
| Cache            | Keeps frequently requested feed information in fast storage to reduce database work.                 |
| Primary database | Stores and updates users, follow relationships, and photo information.                               |
| Read replica     | Holds a copy of the database and serves reads to reduce work on the primary.                         |
| Object storage   | Holds original photo files and thumbnails.                                                           |
| CDN              | Keeps copies of images near users to reduce download time and requests to object storage.            |
| Queue            | Holds thumbnail jobs until a worker is ready to process them.                                        |
| Worker           | Creates thumbnails in the background so upload requests do not wait for image processing.            |

## 7. Upload flow

1. The user selects a photo and taps Upload.
2. The request passes through the load balancer to an app server.
3. The app server checks the user’s identity and the upload details.
4. The app server creates a database record with a photo ID and a status of `pending_upload`.
5. The app server returns a temporary upload URL. This URL grants permission to upload one file to a specific location.
6. The user’s app uploads the photo directly to object storage.
7. Object storage sends an upload event to the queue.
8. A worker takes the job from the queue, reads the original photo, and creates a thumbnail.
9. The worker saves the thumbnail in object storage.
10. The worker updates the database with the thumbnail location and changes the photo’s status to `ready`.
11. The app refreshes affected cached feeds so the photo appears in future feed requests.
12. Other users receive the photo’s details in their feeds and download its thumbnail through the CDN.

If thumbnail processing fails, the queue retries the job. The worker uses the photo ID to avoid creating duplicate results when it receives the same job again.

## 8. Trade-offs

### Cache speed versus fresh information

A cache makes feed requests faster and reduces database work.

However, cached information becomes outdated when someone uploads or deletes a photo. We need to refresh affected entries or give them a short expiry time.

### Read capacity versus immediate updates

A read replica helps the system handle more feed requests.

However, updates take time to reach the replica. A newly uploaded photo might appear after a short delay. The uploader’s immediate status request should read from the primary database.

### Fast uploads versus waiting for thumbnails

Background workers keep image processing outside the upload request.

However, the photo needs a processing state while its thumbnail is being created. The system also needs retries for failed jobs.

### Direct uploads versus extra coordination

Direct uploads keep large files away from app servers, reducing their network workload.

However, some users start an upload and never finish it. The system needs a cleanup process for unfinished uploads and their pending database records.
