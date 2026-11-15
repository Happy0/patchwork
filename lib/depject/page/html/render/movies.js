const {
  Array: MutantArray,
  onceTrue,
  computed,
  Proxy,
  h,
  when,
  map,
  Value,
  watch,
  resolve,
} = require("mutant");
const nest = require("depnest");
const pull = require("pull-stream");

exports.needs = nest({
  "app.navigate": "first",
  "app.refresh": "first",
  "intl.sync.i18n": "first",
  "movies.sheet.edit": "first",
  "sbot.pull.stream": "first",
  "sbot.obs.connection": "first",
  "blob.sync.url": "first",
  "about.obs.color": "first",
  "message.html.markdown": "first",
  "movies.pull.movies": "first",
});

exports.gives = nest("page.html.render");

exports.create = function (api) {
  return nest("page.html.render", function channel(path) {
    if (path !== "/movies") return;
    const i18n = api.intl.sync.i18n;
    const loading = Value(true);
    const searchSpinner = Value(false);
    const movies = MutantArray();
    const listOfMovies = MutantArray();

    /*
== Auxiliary functions ===========================================================================================================
    */

    onceTrue(api.sbot.obs.connection, (sbot) => {
      pull(
        api.movies.pull.movies(sbot, { reverse: true }),
        pull.drain((item) => {
          movies.push(item);
          listOfMovies.push(MovieCard({
            msg: item,
            onClick: () => api.app.navigate(item.key),
            color: api.about.obs.color,
            blobUrl: api.blob.sync.url,
          }));
          loading.set(false);
        }),
      );

      // Get Movies!
    });

    function addNewMovie() {
      api.app.navigate("/movie-search");
    }

    function refresh() {
      api.app.refresh("/movies");
    }

    function MovieCard({ msg, blobUrl, onClick, color }) {
      const movie = msg.value.content;
      const thumbnail = when(
        movie.poster,
        h("BookCover", {
          style: {
            "background-image": `url("${blobUrl(resolve(movie.poster))}")`,
            "background-position": "center",
            "background-size": "contain",
            "background-repeat": "no-repeat",
          },
        }),
        h("BookCover -empty", {
          style: { "background-color": color(movie.title) },
        }, [
          h("i.fa.fa-file-text-o"),
        ]),
      );

      const b = h("BookCard", { "ev-click": onClick }, [
        // h('div.context', [
        //   api.about.html.avatar(author, 'tiny'),
        //   h('div.name', api.about.obs.name(author)),
        //   api.message.html.timeago(blog)
        // ]),
        thumbnail,
        h("div.content", [
          h("div.text.Markdown", [
            h("h1", movie.title),
            h("div.year", movie.year),
          ]),
        ]),
      ]);

      return b;
    }

    /*
== mutant content ===========================================================================================================
    */

    const prepend = [
      h("PageHeading", [
        h("h1", [h("strong", i18n("Movies"))]),
        h("div.meta", [
          h("button -add", {
            "ev-click": addNewMovie,
          }, i18n("Add New Movie")),
          h("button -add", {
            "ev-click": refresh,
            "style": {
              "margin-left": "10px",
            },
          }, i18n("Refresh List")),
        ]),
      ]),
    ];

    return h("Scroller", { style: { overflow: "auto" } }, [
      h("div.wrapper", [
        h("section.prepend", prepend),
        h(
          "section.content",
          h("BookGrid", [map(listOfMovies, (i) => i)]),
        ),
        when(
          loading,
          searchSpinner ? h("Loading -large -search") : h("Loading -large"),
        ),
      ]),
    ]);
  });
};
