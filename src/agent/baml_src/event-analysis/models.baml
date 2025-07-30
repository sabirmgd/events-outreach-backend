class Event {
  name string
  year int
  dates string?
  venue string?
  city string
  country string?
  industry string
  attendeeCount int?
  description string?
  website string?
  organizer string?
  type string?
}

class Company {
  name string
  website string?
  industry string?
  description string?
  headquarters string?
  founded int?
  employeesRange string?
}

class Sponsor {
  company Company
  sponsorshipTier string?
}

class Person {
  name string
  title string?
  company string?
  email string?
  phone string?
  linkedinUrl string?
  bio string?
  location string?
  expertise string[]?
  sessionType string?
  topic string?
  role string?
}

class EventWithDetails {
  event Event
  sponsors Sponsor[]
  speakers Person[]
}